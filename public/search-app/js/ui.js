/* ================================================================
   ui.js — DOM references, mode switching, pagination, helpers
   ================================================================ */

/* ── DOM cache (populated on DOMContentLoaded) ── */
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
  DOM.latexKeywords  = document.getElementById('latexKeywords');
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

/* ── Mode switching ── */
function setMode(mode, options = {}) {
  State.searchMode = mode;
  DOM.modeText.classList.toggle('active', mode === 'text');
  DOM.modeLatex.classList.toggle('active', mode === 'latex');

  DOM.textPanel.classList.toggle('hidden', mode !== 'text');
  DOM.latexPanel.classList.toggle('visible', mode === 'latex');
  DOM.textFilters.classList.toggle('hidden', mode !== 'text');

  if (!options.preserveResults) {
    clearResults();
    State.currentPage = 1;
  }

  if (!options.skipFocus) {
    if (mode === 'latex') DOM.latexInput.focus();
    else DOM.query.focus();
  }
}

/* ── Clear results ── */
function clearResults() {
  DOM.results.innerHTML    = '';
  DOM.pagination.innerHTML = '';
  DOM.status.textContent   = '';
  State.lastResultCount = 0;
}

function showEmptyState(message) {
  State.lastResultCount = 0;
  DOM.results.innerHTML = `
    <div class="search-empty-state">
      <div class="search-empty-kicker">Math Q&A Search</div>
      <p>${message}</p>
    </div>`;
  DOM.pagination.innerHTML = '';
}

/* ── Show loader spinner ── */
function showLoader() {
  if (!State.isPageLoading) {
    DOM.results.innerHTML = '';
    DOM.pagination.innerHTML = '';
  }
  DOM.status.innerHTML     = '<div class="loader"></div>';
}

/* ── Show status message ── */
function showStatus(msg) {
  DOM.status.textContent = msg;
}

/* ── Show error ── */
function showError(msg) {
  DOM.status.textContent = `Error: ${msg}`;
}

/* ── Render pagination buttons ── */
function renderPagination() {
  if (!DOM.pagination) return; // Guard against missing pagination element
  if (State.lastResultCount <= 0) {
    DOM.pagination.innerHTML = '';
    return;
  }

  const pageButtons = [];
  const start = Math.max(1, State.currentPage - 1);
  const end = State.hasMore ? State.currentPage + 1 : State.currentPage;
  for (let page = start; page <= end; page++) {
    pageButtons.push(`
      <button
        type="button"
        class="page-number ${page === State.currentPage ? 'active' : ''}"
        data-page="${page}"
        ${page === State.currentPage ? 'disabled' : ''}
      >${page}</button>`);
  }

  DOM.pagination.innerHTML = `
    <button id="prevBtn" type="button" ${State.currentPage <= 1 || State.isPageLoading ? 'disabled' : ''}>&larr; Previous</button>
    ${pageButtons.join('')}
    <button id="nextBtn" type="button" ${!State.hasMore || State.isPageLoading ? 'disabled' : ''}>Next &rarr;</button>`;

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  // Add event listeners to newly created buttons
  if (prevBtn && !prevBtn.disabled) {
    prevBtn.addEventListener('click', (event) => {
      event.preventDefault();
      handlePageChange(State.currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (nextBtn && !nextBtn.disabled) {
    nextBtn.addEventListener('click', (event) => {
      event.preventDefault();
      handlePageChange(State.currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  DOM.pagination.querySelectorAll('.page-number:not(:disabled)').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      handlePageChange(parseInt(button.dataset.page || '1', 10));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function normalizePage(value) {
  const page = parseInt(value || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function normalizePageSize(value) {
  const pageSize = parseInt(value || '20', 10);
  return [10, 20].includes(pageSize) ? pageSize : 20;
}

function normalizeStatus(value) {
  return value === 'true' || value === 'false' ? value : '';
}

function normalizeMode(value) {
  return value === 'latex' ? 'latex' : 'text';
}

function getActiveQuery() {
  if (State.searchMode === 'latex') {
    return (DOM.latexInput?.value || '').trim();
  }
  return (DOM.query?.value || '').trim();
}

function getSearchStateFromDom(page = State.currentPage) {
  return {
    q: getActiveQuery(),
    tags: typeof TagSelector !== 'undefined' ? TagSelector.getSelected(State.searchMode) : '',
    mode: State.searchMode,
    sort: DOM.sort?.value || 'relevance',
    status: DOM.answered?.value || '',
    page: normalizePage(String(page)),
    pagesize: normalizePageSize(DOM.pageSize?.value),
  };
}

function buildSearchParams(state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.tags) params.set('tags', state.tags);
  params.set('mode', state.mode);
  params.set('sort', state.sort || 'relevance');
  params.set('status', state.status || 'all');
  params.set('page', String(state.page));
  params.set('pagesize', String(state.pagesize));
  return params;
}

function syncParentSearchUrl(params) {
  if (window.parent === window) return;

  try {
    window.parent.postMessage(
      { type: 'SEARCH_URL_UPDATE', query: params.toString() },
      window.location.origin
    );
  } catch (_) {}
}

function updateSearchUrl(state) {
  const params = buildSearchParams(state);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', nextUrl);
  syncParentSearchUrl(params);
}

function applySearchStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const state = {
    q: (params.get('q') || '').trim(),
    tags: (params.get('tags') || '').trim(),
    mode: normalizeMode(params.get('mode')),
    sort: params.get('sort') || 'relevance',
    status: normalizeStatus(params.get('status')),
    page: normalizePage(params.get('page')),
    pagesize: normalizePageSize(params.get('pagesize')),
  };

  setMode(state.mode, { preserveResults: true, skipFocus: true });
  State.currentPage = state.page;

  if (DOM.sort) DOM.sort.value = state.sort;
  if (DOM.answered) DOM.answered.value = state.status;
  if (DOM.pageSize) DOM.pageSize.value = String(state.pagesize);

  if (state.mode === 'latex') {
    if (DOM.latexInput) {
      DOM.latexInput.value = state.q;
      DOM.latexInput.dispatchEvent(new Event('input'));
    }
  } else if (DOM.query) {
    DOM.query.value = state.q;
  }

  if (state.tags && typeof TagSelector !== 'undefined' && TagSelector.setSelected) {
    TagSelector.setSelected(state.mode, state.tags.split(';').map(tag => tag.trim()).filter(Boolean));
  }

  if (!state.q) {
    showEmptyState('Search mathematical questions from Stack Exchange.');
    return;
  }

  updateSearchUrl(state);
  if (state.mode === 'latex') searchLatex();
  else searchText();
}

function handleSearchSubmit(mode = State.searchMode) {
  if (mode !== State.searchMode) {
    setMode(mode, { preserveResults: true });
  }

  const query = getActiveQuery().trim();
  if (!query) {
    showStatus('Please enter a search term.');
    showEmptyState('Search mathematical questions from Stack Exchange.');
    return;
  }

  State.currentPage = 1;
  State.isPageLoading = false;
  updateSearchUrl(getSearchStateFromDom(1));

  if (State.searchMode === 'latex') searchLatex();
  else searchText();
}

function handlePageChange(newPage) {
  const nextPage = normalizePage(String(newPage));
  if (nextPage === State.currentPage || State.isPageLoading) return;

  State.currentPage = nextPage;
  State.isPageLoading = true;
  updateSearchUrl(getSearchStateFromDom(nextPage));
  renderPagination();

  if (State.searchMode === 'latex') searchLatex();
  else searchText();
}

function handleFilterChange() {
  if (!getActiveQuery()) return;
  handleSearchSubmit(State.searchMode);
}

function handleModeSwitch(mode) {
  setMode(mode);
  if (getActiveQuery()) {
    handleSearchSubmit(mode);
  } else {
    updateSearchUrl(getSearchStateFromDom(1));
    showEmptyState('Search mathematical questions from Stack Exchange.');
  }
}

function initSearchUrlState() {
  DOM.sort?.addEventListener('change', handleFilterChange);
  DOM.answered?.addEventListener('change', handleFilterChange);
  DOM.pageSize?.addEventListener('change', handleFilterChange);
  document.addEventListener('search-tags-change', handleFilterChange);
  applySearchStateFromUrl();
}

/* ── Re-typeset MathJax in results ── */function typesetResults() {
  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetClear([DOM.results]);
    MathJax.typesetPromise([DOM.results]).catch(() => {});
  }
}

/* ── Fetch with timeout (AbortController) ── */
function fetchWithTimeout(url, ms = Config.SEARCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

/* ── Search History ── */
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
  if (!DOM.historyBar) return; // Element removed
  
  if (!history.length) {
    DOM.historyBar.classList.remove('visible');
    return;
  }

  DOM.historyBar.classList.add('visible');
  DOM.historyChips.innerHTML = history.slice(0, 12).map(h => {
    const label = h.query.length > 40 ? h.query.slice(0, 37) + '…' : h.query;
    const icon = h.mode === 'latex' ? '∑' : '🔍';
    return `<span class="history-chip" data-mode="${h.mode}" data-query="${h.query.replace(/"/g, '&quot;')}" title="${h.query}">
      <span class="chip-mode">${icon}</span>${label}
    </span>`;
  }).join('');

  // Click handler for chips
  DOM.historyChips.querySelectorAll('.history-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const mode  = chip.dataset.mode;
      const query = chip.dataset.query;
      setMode(mode);
      if (mode === 'latex') {
        DOM.latexInput.value = query;
        // Trigger preview update
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
