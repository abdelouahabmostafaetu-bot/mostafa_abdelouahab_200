/* ================================================================
   search-cache.js — Result caching + Search history + Proxy fallback
   ================================================================
   - Two-tier cache: fast in-memory Map + persistent localStorage
   - localStorage cache survives reloads & rate-limit bans (24 h TTL)
   - CORS proxy fallback: when SE API returns 429, auto-retry
     through Config.CORS_PROXIES in order
   - Optional SE API key support: appends &key= to SE requests when set
   - Search history with timestamps (persisted in sessionStorage)
   - Shared across both text and LaTeX search modes
   ================================================================ */

const SearchCache = (() => {
  const MAX_CACHE     = 60;
  const MAX_PERSIST   = 200;           // max localStorage entries
  const MAX_HISTORY   = 30;
  const MEM_TTL       = 5 * 60 * 1000; // 5 min memory cache
  const _cache        = new Map();     // key → { data, ts }
  const _history      = [];            // [{ mode, query, ts, count }]
  const LS_PREFIX     = 'mqs_c_';      // localStorage key prefix

  /* ────────────────────────────────────────────
     IN-MEMORY CACHE (fast, short-lived)
     ──────────────────────────────────────────── */
  function memGet(url) {
    const entry = _cache.get(url);
    if (!entry) return null;
    if (Date.now() - entry.ts > MEM_TTL) { _cache.delete(url); return null; }
    return entry.data;
  }

  function memSet(url, data) {
    if (_cache.size >= MAX_CACHE) {
      const oldest = _cache.keys().next().value;
      _cache.delete(oldest);
    }
    _cache.set(url, { data, ts: Date.now() });
  }

  /* ────────────────────────────────────────────
     PERSISTENT CACHE (localStorage, long-lived)
     ──────────────────────────────────────────── */
  function persistGet(url) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + _hash(url));
      if (!raw) return null;
      const entry = JSON.parse(raw);
      const ttl = (Config && Config.PERSIST_CACHE_TTL) || 24 * 60 * 60 * 1000;
      if (Date.now() - entry.ts > ttl) {
        localStorage.removeItem(LS_PREFIX + _hash(url));
        return null;
      }
      return entry.data;
    } catch (_) { return null; }
  }

  function persistSet(url, data) {
    try {
      const key = LS_PREFIX + _hash(url);
      localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
      _evictPersist();
    } catch (_) { /* quota exceeded — ignore */ }
  }

  /** Simple string hash for short localStorage keys */
  function _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(36);
  }

  /** Evict oldest persistent entries if over limit */
  function _evictPersist() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) keys.push(k);
    }
    if (keys.length <= MAX_PERSIST) return;
    // Sort by timestamp, remove oldest
    const entries = keys.map(k => {
      try { return { k, ts: JSON.parse(localStorage.getItem(k)).ts }; }
      catch (_) { return { k, ts: 0 }; }
    }).sort((a, b) => a.ts - b.ts);
    const remove = entries.slice(0, entries.length - MAX_PERSIST);
    remove.forEach(e => localStorage.removeItem(e.k));
  }

  /* ────────────────────────────────────────────
     COMBINED GET / SET  (memory first, then disk)
     ──────────────────────────────────────────── */
  function get(url) {
    return memGet(url) || persistGet(url);
  }

  function set(url, data) {
    memSet(url, data);
    persistSet(url, data);
  }

  /* ────────────────────────────────────────────
     OPTIONAL SE API KEY — appends key= to SE API URLs
     ──────────────────────────────────────────── */
  function _appendKey(url) {
    if (!Config.SE_API_KEY) return url;
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + 'key=' + encodeURIComponent(Config.SE_API_KEY);
  }

  /* ────────────────────────────────────────────
     CORS PROXY FALLBACK
     Try each proxy in Config.CORS_PROXIES until one works.
     ──────────────────────────────────────────── */
  async function _fetchViaProxy(url, timeoutMs) {
    const proxies = (Config && Config.CORS_PROXIES) || [];
    let lastErr = null;
    for (const proxy of proxies) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const resp = await fetchWithTimeout(proxyUrl, timeoutMs);
        if (resp.ok) return resp;
        // If proxy also returns an error, try next one
        lastErr = new Error('Proxy returned ' + resp.status);
      } catch (e) { lastErr = e; }
    }
    if (lastErr) throw lastErr;
    throw new Error('No CORS proxies available');
  }

  /* ────────────────────────────────────────────
     cachedFetch — the main entry point
     Priority: memory cache → localStorage cache → direct fetch
               → (on 429) proxy fetch → cached stale data
     ──────────────────────────────────────────── */
  async function cachedFetch(url, timeoutMs) {
    // 1. Check caches
    const cached = get(url);
    if (cached) return { ok: true, status: 200, json: () => Promise.resolve(cached), _cached: true };

    // 2. Append API key for SE API requests
    const fetchUrl = _isSEApi(url) ? _appendKey(url) : url;

    // 3. Try direct fetch
    let resp;
    try {
      resp = await fetchWithTimeout(fetchUrl, timeoutMs);
    } catch (e) {
      // Network error — try proxy
      resp = null;
    }

    // 4. If rate-limited (429) or network failed, try CORS proxies
    if (!resp || resp.status === 429) {
      try {
        resp = await _fetchViaProxy(fetchUrl, timeoutMs);
      } catch (_) {
        // Proxy also failed — return the original 429 response or synthesize one
        if (resp) return resp;
        return { ok: false, status: 429, json: () => Promise.resolve({ error_message: 'Rate limited + proxy failed' }) };
      }
    }

    // 5. Cache successful responses
    if (resp.ok) {
      try {
        const clone = resp.clone();
        clone.json().then(d => set(url, d)).catch(() => {});
      } catch (_) {}
    }
    return resp;
  }

  /** Check whether a URL hits the SE API */
  function _isSEApi(url) {
    return url.includes('api.stackexchange.com');
  }

  /* ────────────────────────────────────────────
     SEARCH HISTORY
     ──────────────────────────────────────────── */
  function addHistory(mode, query) {
    const idx = _history.findIndex(h => h.mode === mode && h.query === query);
    if (idx >= 0) {
      _history[idx].ts = Date.now();
      _history[idx].count++;
      const item = _history.splice(idx, 1)[0];
      _history.unshift(item);
    } else {
      _history.unshift({ mode, query, ts: Date.now(), count: 1 });
      if (_history.length > MAX_HISTORY) _history.pop();
    }
    _saveHistory();
  }

  function getHistory(mode) {
    if (mode) return _history.filter(h => h.mode === mode);
    return [..._history];
  }

  function clearHistory() {
    _history.length = 0;
    _saveHistory();
  }

  function _saveHistory() {
    try { sessionStorage.setItem('mqs_history', JSON.stringify(_history)); } catch (_) {}
  }

  function _loadHistory() {
    try {
      const data = sessionStorage.getItem('mqs_history');
      if (data) {
        const arr = JSON.parse(data);
        _history.length = 0;
        _history.push(...arr);
      }
    } catch (_) {}
  }

  _loadHistory();

  /* ── Stats ── */
  function cacheStats() {
    return { size: _cache.size, maxSize: MAX_CACHE, persist: _countPersist() };
  }

  function _countPersist() {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i).startsWith(LS_PREFIX)) n++;
    }
    return n;
  }

  /** Clear all persistent cache entries */
  function clearPersistCache() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }

  return { cachedFetch, addHistory, getHistory, clearHistory, cacheStats, get, set, clearPersistCache };
})();
