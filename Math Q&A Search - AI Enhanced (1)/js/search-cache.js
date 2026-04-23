/* ================================================================
   search-cache.js — Result caching + Search history + Proxy fallback
   ================================================================
   - Two-tier cache: fast in-memory Map + secondary in-memory store
   - CORS proxy fallback: when SE API returns 429, auto-retry
     through Config.CORS_PROXIES in order
   - SE API key support: appends &key= to SE requests when set
   - Search history with timestamps (in-memory)
   - Shared across both text and LaTeX search modes
   ================================================================ */

const SearchCache = (() => {
  const MAX_CACHE     = 60;
  const MAX_PERSIST   = 200;
  const MAX_HISTORY   = 30;
  const MEM_TTL       = 5 * 60 * 1000; // 5 min memory cache
  const _cache        = new Map();     // key → { data, ts }
  const _history      = [];            // [{ mode, query, ts, count }]
  const _persistCache = new Map();     // secondary in-memory store (replaces localStorage)

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
     PERSISTENT CACHE (in-memory secondary store)
     ──────────────────────────────────────────── */
  function persistGet(url) {
    try {
      const key = _hash(url);
      const entry = _persistCache.get(key);
      if (!entry) return null;
      const ttl = (Config && Config.PERSIST_CACHE_TTL) || 24 * 60 * 60 * 1000;
      if (Date.now() - entry.ts > ttl) {
        _persistCache.delete(key);
        return null;
      }
      return entry.data;
    } catch (_) { return null; }
  }

  function persistSet(url, data) {
    try {
      const key = _hash(url);
      _persistCache.set(key, { data, ts: Date.now() });
      _evictPersist();
    } catch (_) {}
  }

  /** Simple string hash */
  function _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(36);
  }

  /** Evict oldest persistent entries if over limit */
  function _evictPersist() {
    if (_persistCache.size <= MAX_PERSIST) return;
    const entries = [..._persistCache.entries()]
      .map(([k, v]) => ({ k, ts: v.ts || 0 }))
      .sort((a, b) => a.ts - b.ts);
    const remove = entries.slice(0, entries.length - MAX_PERSIST);
    remove.forEach(e => _persistCache.delete(e.k));
  }

  /* ────────────────────────────────────────────
     COMBINED GET / SET  (memory first, then secondary)
     ──────────────────────────────────────────── */
  function get(url) {
    return memGet(url) || persistGet(url);
  }

  function set(url, data) {
    memSet(url, data);
    persistSet(url, data);
  }

  /* ────────────────────────────────────────────
     SE API KEY — appends key= to SE API URLs
     ──────────────────────────────────────────── */
  function _appendKey(url) {
    if (!Config.SE_API_KEY) return url;
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + 'key=' + encodeURIComponent(Config.SE_API_KEY);
  }

  /* ────────────────────────────────────────────
     CORS PROXY FALLBACK
     ──────────────────────────────────────────── */
  async function _fetchViaProxy(url, timeoutMs) {
    const proxies = (Config && Config.CORS_PROXIES) || [];
    let lastErr = null;
    for (const proxy of proxies) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const resp = await fetchWithTimeout(proxyUrl, timeoutMs);
        if (resp.ok) return resp;
        lastErr = new Error('Proxy returned ' + resp.status);
      } catch (e) { lastErr = e; }
    }
    if (lastErr) throw lastErr;
    throw new Error('No CORS proxies available');
  }

  /* ────────────────────────────────────────────
     cachedFetch — the main entry point
     ──────────────────────────────────────────── */
  async function cachedFetch(url, timeoutMs) {
    const cached = get(url);
    if (cached) return { ok: true, status: 200, json: () => Promise.resolve(cached), _cached: true };

    const fetchUrl = _isSEApi(url) ? _appendKey(url) : url;

    let resp;
    try {
      resp = await fetchWithTimeout(fetchUrl, timeoutMs);
    } catch (e) {
      resp = null;
    }

    if (!resp || resp.status === 429) {
      try {
        resp = await _fetchViaProxy(fetchUrl, timeoutMs);
      } catch (_) {
        if (resp) return resp;
        return { ok: false, status: 429, json: () => Promise.resolve({ error_message: 'Rate limited + proxy failed' }) };
      }
    }

    if (resp.ok) {
      try {
        const clone = resp.clone();
        clone.json().then(d => set(url, d)).catch(() => {});
      } catch (_) {}
    }
    return resp;
  }

  function _isSEApi(url) {
    return url.includes('api.stackexchange.com');
  }

  /* ────────────────────────────────────────────
     SEARCH HISTORY (in-memory only)
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
  }

  function getHistory(mode) {
    if (mode) return _history.filter(h => h.mode === mode);
    return [..._history];
  }

  function clearHistory() {
    _history.length = 0;
  }

  /* ── Stats ── */
  function cacheStats() {
    return { size: _cache.size, maxSize: MAX_CACHE, persist: _persistCache.size };
  }

  function clearPersistCache() {
    _persistCache.clear();
  }

  return { cachedFetch, addHistory, getHistory, clearHistory, cacheStats, get, set, clearPersistCache };
})();
