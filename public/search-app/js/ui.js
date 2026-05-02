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

/* ── Clear results ── */
function clearResults() {
  DOM.results.innerHTML    = '';
  DOM.pagination.innerHTML = '';
  DOM.status.textContent   = '';
}

/* ── Show loader spinner ── */
function showLoader() {
  DOM.results.innerHTML    = '';
  DOM.pagination.innerHTML = '';
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
function renderPagination(searchFn) {
  if (!DOM.pagination) return; // Guard against missing pagination element
  
  DOM.pagination.innerHTML = `
    <button id="prevBtn" type="button" ${State.currentPage <= 1 ? 'disabled' : ''}>&larr; Previous</button>
    <button id="nextBtn" type="button" ${!State.hasMore ? 'disabled' : ''}>Next &rarr;</button>`;

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  // Add event listeners to newly created buttons
  if (prevBtn && !prevBtn.disabled) {
    prevBtn.addEventListener('click', (event) => {
      event.preventDefault();
      State.currentPage--;
      searchFn();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (nextBtn && !nextBtn.disabled) {
    nextBtn.addEventListener('click', (event) => {
      event.preventDefault();
      State.currentPage++;
      searchFn();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
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
