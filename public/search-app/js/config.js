/* ================================================================
   config.js — API endpoints, constants & shared state
   ================================================================ */

const Config = Object.freeze({
  SE_API : 'https://api.stackexchange.com/2.3',
  SITE   : 'math',
  SE_FILTER      : '!nNPvSNdWme',       // search results: includes excerpt
  SE_BODY_FILTER : '!nNPvSNe7y9',       // questions: includes body HTML
  SE_ANS_FILTER  : '!-.mgQ5bBCuz1',     // answers: body + score + accepted
  DEBOUNCE_MS  : 250,                    // preview debounce
  TAG_SUGGEST_DEBOUNCE_MS : 180,         // tag autocomplete debounce
  TAG_SUGGEST_LIMIT : 12,                // tag suggestions shown at once
  RESULTS_PER_PAGE : 10,                 // fixed fast mobile-friendly page size
  SEARCH_TIMEOUT_MS : 10000,             // abort slow requests

  /* Optional StackExchange API key.
     Leave empty to use the public unauthenticated API. */
  SE_API_KEY : '',

  /* ── CORS proxy fallback ──
     When the direct SE API returns 429 (rate-limited), requests
     are retried through these CORS proxies in order.
     Each must accept:  PROXY_URL + encodeURIComponent(original_url) */
  CORS_PROXIES : [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
  ],

  /* ── Persistent cache TTL (milliseconds) ──
     localStorage cache survives page reloads and rate-limit bans. */
  PERSIST_CACHE_TTL : 24 * 60 * 60 * 1000,       // 24 hours
});

/* ── Shared mutable state ── */
const State = {
  currentPage : 1,
  hasMore     : false,
  searchMode  : 'text',                  // 'text' | 'latex'
  lastSearch  : null,
};
