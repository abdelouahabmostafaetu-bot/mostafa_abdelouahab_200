/* ================================================================
   ui.js - DOM references, mode switching, pagination, helpers
   ================================================================ */

/* -- DOM cache (populated on DOMContentLoaded) -- */
const DOM = {};

function cacheDom() {
  DOM.query          = document.getElementById('query');
  DOM.sort           = document.getElementById('sort');
  DOM.answered       = document.getElementById('answered');
  DOM.pageSize       = document.getElementById('pageSize');
  DOM.results        = document.getElementById('results');
  DOM.status         = document.getElementById('status');
  DOM.pagination     = document.getElementById('pagination');
  DOM.searchBtn      = document.getElementById('searchBtn');
  DOM.latexInput     = document.getElementById('latexInput');
  DOM.latexPreview   = document.getElementById('latexPreview');
  DOM.latexSearchBtn = document.getElementById('latexSearchBtn');
  DOM.textPanel      = document.getElementById('textSearchPanel');
  DOM.latexPanel     = document.getElementById('latexSearchPanel');
  DOM.textFilters    = document.getElementById('textFilters');
  DOM.modeText       = document.getElementById('modeText');
  DOM.modeLatex      = document.getElementById('modeLatex');
  DOM.historyBar     = document.getElementById('historyBar');
  DOM.historyChips   = document.getElementById('historyChips');
  DOM.historyClear   = document.getElementById('historyClear');
}

function removeTransientPanels() {
  [
    'searchAnalytics',
    'tagWikiPanel',
    'searchSuggestions',
    'confidenceBar',
    'searchActionBar',
  ].forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.remove();
  });
}

/* -- Mode switching -- */
function setMode(mode) {
  State.searchMode = mode;
  DOM.modeText.classList.toggle('active', mode === 'text');
  DOM.modeLatex.classList.toggle('active', mode === 'latex');

  DOM.textPanel.classList.toggle('hidden', mode !== 'text');
  DOM.latexPanel.classList.toggle('visible', mode === 'latex');
  DOM.textFilters.classList.toggle('hidden', mode !== 'text');

  clearResults();
  State.currentPage = 1;

  if (mode === 'latex') DOM.latexInput.focus();
  else DOM.query.focus();
}

/* -- Clear results -- */
function clearResults() {
  removeTransientPanels();
  DOM.results.innerHTML = '';
  DOM.pagination.innerHTML = '';
  DOM.status.textContent = '';
}

/* -- Show loader spinner -- */
function showLoader() {
  removeTransientPanels();
  DOM.results.innerHTML = '';
  DOM.pagination.innerHTML = '';
  DOM.status.innerHTML = '<div class="loader"></div>';
}

/* -- Show status message -- */
function showStatus(msg) {
  DOM.status.textContent = msg;
}

function showStatusHtml(html) {
  DOM.status.innerHTML = html;
}

/* -- Show error -- */
function showError(msg) {
  DOM.status.textContent = `Error: ${msg}`;
}

/* -- Render pagination buttons -- */
function renderPagination(searchFn) {
  DOM.pagination.innerHTML = `
    <button id="prevBtn" ${State.currentPage <= 1 ? 'disabled' : ''}>&larr; Previous</button>
    <button id="nextBtn" ${!State.hasMore ? 'disabled' : ''}>Next &rarr;</button>`;

  document.getElementById('prevBtn').addEventListener('click', () => {
    State.currentPage--;
    searchFn();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('nextBtn').addEventListener('click', () => {
    State.currentPage++;
    searchFn();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* -- Re-typeset MathJax in results -- */
function typesetResults() {
  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetClear([DOM.results]);
    MathJax.typesetPromise([DOM.results]).catch(() => {});
  }
}

/* -- Fetch with timeout (AbortController) -- */
function fetchWithTimeout(url, ms = Config.SEARCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function formatCompactNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num === 0) return '0';
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(num >= 10000000 ? 0 : 1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}k`;
  return String(num);
}

function optimizeRenderedContent(root) {
  if (!root) return;

  root.querySelectorAll('img').forEach((img) => {
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
  });

  root.querySelectorAll('a[target="_blank"]').forEach((link) => {
    const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('noreferrer');
    link.setAttribute('rel', Array.from(rel).join(' '));
  });
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', 'readonly');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (_) {
    ok = false;
  }
  area.remove();
  return ok;
}

function buildSearchParams(searchState) {
  const params = new URLSearchParams();
  const state = searchState || {};
  const mode = state.mode || State.searchMode || 'text';

  params.set('mode', mode);
  if (state.q) params.set('q', state.q);
  if (state.tex) params.set('tex', state.tex);
  if (state.sort) params.set('sort', state.sort);
  if (state.answered) params.set('answered', state.answered);
  if (state.page && state.page > 1) params.set('page', String(state.page));
  if (state.deep) params.set('deep', String(state.deep));
  if (state.tags && state.tags.length) params.set('tags', state.tags.join(','));

  return params;
}

function buildSearchPermalink(searchState, target) {
  const params = buildSearchParams(searchState);
  const origin = window.location.origin;
  const path = target === 'iframe' ? '/search-app/index.html' : '/search';
  const qs = params.toString();
  return `${origin}${path}${qs ? `?${qs}` : ''}`;
}

function buildMSESearchUrl(searchState) {
  const state = searchState || State.lastSearch || {};
  const baseQuery = state.mode === 'latex'
    ? (state.mseQuery || state.tex || '')
    : (state.q || '');
  const tags = Array.isArray(state.tags) ? state.tags : [];
  const tagSuffix = tags.map(tag => `[${tag}]`).join(' ');
  const query = `${baseQuery} ${tagSuffix}`.trim();
  return `https://math.stackexchange.com/search?q=${encodeURIComponent(query)}`;
}

function syncSearchUrl(partialState) {
  const nextState = {
    ...(State.lastSearch || {}),
    ...(partialState || {}),
    mode: (partialState && partialState.mode) || State.searchMode || 'text',
  };
  State.lastSearch = nextState;

  const iframeUrl = buildSearchPermalink(nextState, 'iframe');
  const shellUrl = buildSearchPermalink(nextState, 'shell');

  window.history.replaceState({}, '', iframeUrl);

  try {
    if (window.top && window.top !== window && window.top.location.origin === window.location.origin) {
      window.top.history.replaceState({}, '', shellUrl);
    }
  } catch (_) {}

  return shellUrl;
}

function parseSearchStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || (params.get('tex') ? 'latex' : 'text');
  const tags = (params.get('tags') || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

  return {
    mode,
    q: params.get('q') || '',
    tex: params.get('tex') || '',
    sort: params.get('sort') || 'best',
    answered: params.get('answered') || '',
    page: Math.max(parseInt(params.get('page') || '1', 10) || 1, 1),
    deep: params.get('deep') || '',
    tags,
  };
}

function restoreSearchFromUrl() {
  const state = parseSearchStateFromUrl();
  if (!state.q && !state.tex) return;

  State.lastSearch = state;
  setMode(state.mode);
  State.currentPage = state.page || 1;

  if (typeof TagSelector !== 'undefined') {
    TagSelector.clearSelection('text');
    TagSelector.clearSelection('latex');
    if (state.tags.length) TagSelector.setSelected(state.mode, state.tags);
  }

  if (DOM.query) DOM.query.value = state.q || '';
  if (DOM.sort && state.sort) DOM.sort.value = state.sort;
  if (DOM.answered) DOM.answered.value = state.answered || '';

  if (DOM.latexInput) {
    DOM.latexInput.value = state.tex || '';
    DOM.latexInput.dispatchEvent(new Event('input'));
  }

  const durationSelect = document.getElementById('deepDuration');
  if (durationSelect && state.deep) durationSelect.value = state.deep;

  if (state.mode === 'latex') searchLatex();
  else searchText();
}

function renderSearchActionBar(options) {
  const old = document.getElementById('searchActionBar');
  if (old) old.remove();

  const state = options && options.searchState ? options.searchState : (State.lastSearch || {});
  const shareUrl = (options && options.shareUrl) || buildSearchPermalink(state, 'shell');
  const mseUrl = (options && options.mseUrl) || buildMSESearchUrl(state);
  const summary = options && options.summary ? options.summary : '';
  const clusters = options && options.clusters ? options.clusters : [];

  const bar = document.createElement('div');
  bar.id = 'searchActionBar';
  bar.className = 'search-action-bar';

  const clusterHtml = clusters.length
    ? `<div class="search-clusters">
        <span class="cluster-label">Explore topics</span>
        ${clusters.slice(0, 4).map(cluster =>
          `<button class="cluster-chip" type="button" data-cluster-tag="${escapeAttr(cluster.tag)}">
            ${escapeHtml(cluster.label || cluster.tag)} <span>${cluster.count}</span>
          </button>`
        ).join('')}
      </div>`
    : '';

  bar.innerHTML = `
    <div class="search-action-head">
      <div class="search-action-summary">${summary}</div>
      <div class="search-action-buttons">
        <button class="search-action-btn" type="button" data-copy-search-link="1">Copy Search Link</button>
        <a class="search-action-btn search-action-link" href="${escapeAttr(mseUrl)}" target="_blank" rel="noopener noreferrer">Open On MSE</a>
      </div>
    </div>
    ${clusterHtml}`;

  DOM.results.parentNode.insertBefore(bar, DOM.results);

  const copyBtn = bar.querySelector('[data-copy-search-link]');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const ok = await copyTextToClipboard(shareUrl);
      copyBtn.textContent = ok ? 'Copied' : 'Copy Failed';
      window.setTimeout(() => {
        copyBtn.textContent = 'Copy Search Link';
      }, 1400);
    });
  }

  bar.querySelectorAll('[data-cluster-tag]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-cluster-tag');
      if (!tag || typeof TagSelector === 'undefined') return;

      const existing = TagSelector.getSelectedArray(state.mode || State.searchMode || 'text');
      const merged = [...new Set([...existing, tag])];
      TagSelector.setSelected(state.mode || State.searchMode || 'text', merged);
      State.currentPage = 1;

      if ((state.mode || State.searchMode) === 'latex') searchLatex();
      else searchText();
    });
  });
}

/* -- Search History -- */
function initSearchHistory() {
  if (DOM.historyClear) {
    DOM.historyClear.addEventListener('click', () => {
      SearchCache.clearHistory();
      refreshHistoryUI();
    });
  }
  refreshHistoryUI();
}

function refreshHistoryUI() {
  const history = SearchCache.getHistory();
  if (!history.length) {
    DOM.historyBar.classList.remove('visible');
    return;
  }

  DOM.historyBar.classList.add('visible');
  DOM.historyChips.innerHTML = history.slice(0, 12).map((h) => {
    const label = h.query.length > 40 ? `${h.query.slice(0, 37)}...` : h.query;
    const icon = h.mode === 'latex' ? '∑' : '⌕';
    return `<span class="history-chip" data-mode="${h.mode}" data-query="${escapeAttr(h.query)}" title="${escapeAttr(h.query)}">
      <span class="chip-mode">${icon}</span>${escapeHtml(label)}
    </span>`;
  }).join('');

  DOM.historyChips.querySelectorAll('.history-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const mode = chip.dataset.mode;
      const query = chip.dataset.query || '';
      setMode(mode);
      if (mode === 'latex') {
        DOM.latexInput.value = query;
        DOM.latexInput.dispatchEvent(new Event('input'));
        State.currentPage = 1;
        searchLatex();
      } else {
        DOM.query.value = query;
        State.currentPage = 1;
        searchText();
      }
    });
  });
}
