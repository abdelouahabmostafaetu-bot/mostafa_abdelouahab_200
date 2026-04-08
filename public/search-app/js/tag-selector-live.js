/* ================================================================
   tag-selector-live.js - Math StackExchange style tag autocomplete
   Suggests tags after the first letter using the StackExchange API.
   Falls back to a local curated tag list if the network is slow.
   ================================================================ */

const TagSelector = (function () {
  const TAG_GROUPS = [
    {
      label: 'Calculus',
      tags: ['calculus', 'integration', 'definite-integrals', 'improper-integrals',
        'indefinite-integrals', 'limits', 'derivatives', 'multivariable-calculus',
        'partial-derivative', 'differential-equations', 'ordinary-differential-equations',
        'partial-differential-equations', 'sequences-and-series', 'power-series',
        'taylor-expansion', 'fourier-analysis', 'laplace-transform']
    },
    {
      label: 'Algebra',
      tags: ['linear-algebra', 'abstract-algebra', 'matrices', 'eigenvalues-eigenvectors',
        'group-theory', 'ring-theory', 'field-theory', 'polynomials',
        'systems-of-equations', 'vector-spaces', 'determinant', 'inequality']
    },
    {
      label: 'Analysis',
      tags: ['real-analysis', 'complex-analysis', 'functional-analysis', 'measure-theory',
        'metric-spaces', 'continuity', 'convergence-divergence', 'uniform-convergence',
        'lebesgue-integral', 'banach-spaces', 'hilbert-spaces']
    },
    {
      label: 'Discrete',
      tags: ['combinatorics', 'probability', 'statistics', 'number-theory',
        'prime-numbers', 'graph-theory', 'recurrence-relations',
        'generating-functions', 'permutations', 'binomial-coefficients',
        'modular-arithmetic', 'elementary-number-theory']
    },
    {
      label: 'Geometry',
      tags: ['geometry', 'euclidean-geometry', 'analytic-geometry', 'differential-geometry',
        'trigonometry', 'topology', 'general-topology', 'algebraic-topology',
        'algebraic-geometry', 'projective-geometry', 'circles', 'conic-sections']
    },
    {
      label: 'Logic',
      tags: ['logic', 'set-theory', 'proof-writing', 'proof-verification',
        'induction', 'axiom-of-choice', 'cardinals', 'order-theory',
        'first-order-logic', 'propositional-calculus']
    },
    {
      label: 'Applied',
      tags: ['optimization', 'numerical-methods', 'special-functions',
        'gamma-function', 'zeta-function', 'beta-function', 'elliptic-integrals',
        'asymptotics', 'closed-form', 'contest-math', 'recreational-mathematics',
        'reference-request', 'soft-question']
    }
  ];

  const INPUT_IDS = { text: 'textTagInput', latex: 'latexTagInput' };
  const DROPDOWN_IDS = { text: 'textTagDropdown', latex: 'latexTagDropdown' };
  const CHIP_IDS = { text: 'textTagChips', latex: 'latexTagChips' };
  const ROOT_IDS = { text: 'textTagAuto', latex: 'latexTagAuto' };

  const FALLBACK_TAGS = [];
  const FALLBACK_GROUPS = Object.create(null);
  for (const group of TAG_GROUPS) {
    for (const tag of group.tags) {
      FALLBACK_TAGS.push(tag);
      FALLBACK_GROUPS[tag] = group.label;
    }
  }

  const _selected = { text: new Set(), latex: new Set() };
  const _suggestions = { text: [], latex: [] };
  const _activeIdx = { text: -1, latex: -1 };
  const _requestToken = { text: 0, latex: 0 };
  const _debounceTimers = { text: null, latex: null };

  const SUGGEST_LIMIT = (typeof Config !== 'undefined' && Config.TAG_SUGGEST_LIMIT) || 12;
  const SUGGEST_DEBOUNCE_MS = (typeof Config !== 'undefined' && Config.TAG_SUGGEST_DEBOUNCE_MS) || 180;

  function byId(id) {
    return document.getElementById(id);
  }

  function getNodes(mode) {
    return {
      input: byId(INPUT_IDS[mode]),
      dropdown: byId(DROPDOWN_IDS[mode]),
      chips: byId(CHIP_IDS[mode]),
      root: byId(ROOT_IDS[mode]),
    };
  }

  function normalizeQuery(value) {
    return String(value || '').trim().toLowerCase();
  }

  function toTagLookupQuery(query) {
    return query.replace(/\s+/g, '-');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCount(count) {
    if (!count) return '';
    if (count >= 10000) return `${Math.round(count / 1000)}k`;
    if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return String(count);
  }

  function matchesQuery(tag, query) {
    if (!query) return false;
    const normalizedTag = tag.toLowerCase();
    const lookupQuery = toTagLookupQuery(query);
    return normalizedTag.includes(query) || normalizedTag.includes(lookupQuery);
  }

  function highlightMatch(tag, query) {
    if (!query) return escapeHtml(tag);

    const tagLower = tag.toLowerCase();
    const normalizedQuery = toTagLookupQuery(query);
    let token = normalizedQuery;
    let idx = tagLower.indexOf(normalizedQuery);

    if (idx === -1) {
      token = query;
      idx = tagLower.indexOf(query);
    }

    if (idx === -1) return escapeHtml(tag);

    const before = tag.slice(0, idx);
    const match = tag.slice(idx, idx + token.length);
    const after = tag.slice(idx + token.length);

    return `${escapeHtml(before)}<span class="tag-match">${escapeHtml(match)}</span>${escapeHtml(after)}`;
  }

  function closeDropdown(mode) {
    const { dropdown } = getNodes(mode);
    _suggestions[mode] = [];
    _activeIdx[mode] = -1;
    if (!dropdown) return;
    dropdown.innerHTML = '';
    dropdown.classList.remove('open');
  }

  function updateActiveItem(mode) {
    const { dropdown } = getNodes(mode);
    if (!dropdown) return;
    const items = dropdown.querySelectorAll('.tag-dropdown-item');
    items.forEach((item, idx) => {
      const active = idx === _activeIdx[mode];
      item.classList.toggle('active', active);
      if (active) item.scrollIntoView({ block: 'nearest' });
    });
  }

  function buildSuggestionItem(suggestion, query, mode) {
    const item = document.createElement('div');
    item.className = 'tag-dropdown-item';
    item.dataset.tag = suggestion.name;
    item.innerHTML = `
      <span class="tag-suggestion-main">${highlightMatch(suggestion.name, query)}</span>
      <span class="tag-suggestion-meta">${escapeHtml(suggestion.meta)}</span>`;
    item.addEventListener('click', () => selectTag(suggestion.name, mode));
    return item;
  }

  function renderLoading(mode, fallbackSuggestions, query) {
    const { dropdown } = getNodes(mode);
    if (!dropdown) return;

    dropdown.innerHTML = '';
    dropdown.classList.add('open');

    const visibleFallback = fallbackSuggestions.slice(0, SUGGEST_LIMIT);
    if (visibleFallback.length > 0) {
      _suggestions[mode] = visibleFallback;
      _activeIdx[mode] = 0;
      for (const suggestion of visibleFallback) {
        dropdown.appendChild(buildSuggestionItem(suggestion, query, mode));
      }
      updateActiveItem(mode);
    } else {
      _suggestions[mode] = [];
      _activeIdx[mode] = -1;
    }

    const loading = document.createElement('div');
    loading.className = 'tag-dropdown-loading';
    loading.textContent = 'Searching Math StackExchange tags...';
    dropdown.appendChild(loading);
  }

  function renderEmpty(mode, message) {
    const { dropdown } = getNodes(mode);
    if (!dropdown) return;
    _suggestions[mode] = [];
    _activeIdx[mode] = -1;
    dropdown.innerHTML = `<div class="tag-dropdown-empty">${escapeHtml(message)}</div>`;
    dropdown.classList.add('open');
  }

  function renderSuggestions(mode, suggestions, query) {
    const { dropdown } = getNodes(mode);
    if (!dropdown) return;

    if (!query) {
      closeDropdown(mode);
      return;
    }

    if (!suggestions.length) {
      renderEmpty(mode, 'No matching tags');
      return;
    }

    dropdown.innerHTML = '';
    dropdown.classList.add('open');
    _suggestions[mode] = suggestions.slice(0, SUGGEST_LIMIT);
    _activeIdx[mode] = _suggestions[mode].length ? 0 : -1;

    for (const suggestion of _suggestions[mode]) {
      dropdown.appendChild(buildSuggestionItem(suggestion, query, mode));
    }

    updateActiveItem(mode);
  }

  function renderChips(mode) {
    const { chips } = getNodes(mode);
    if (!chips) return;

    chips.innerHTML = '';

    for (const tag of _selected[mode]) {
      const chip = document.createElement('span');
      chip.className = 'tag-selected-chip';
      chip.appendChild(document.createTextNode(tag));

      const remove = document.createElement('span');
      remove.className = 'tag-remove';
      remove.textContent = 'x';
      remove.setAttribute('role', 'button');
      remove.setAttribute('aria-label', `Remove tag ${tag}`);
      remove.addEventListener('click', () => {
        _selected[mode].delete(tag);
        renderChips(mode);
      });

      chip.appendChild(remove);
      chips.appendChild(chip);
    }
  }

  function buildFallbackSuggestions(query, mode) {
    return FALLBACK_TAGS
      .filter(tag => !_selected[mode].has(tag) && matchesQuery(tag, query))
      .sort((left, right) => {
        const leftStarts = left.startsWith(query) || left.startsWith(toTagLookupQuery(query)) ? 0 : 1;
        const rightStarts = right.startsWith(query) || right.startsWith(toTagLookupQuery(query)) ? 0 : 1;
        if (leftStarts !== rightStarts) return leftStarts - rightStarts;
        return left.localeCompare(right);
      })
      .map(tag => ({
        name: tag,
        count: 0,
        meta: FALLBACK_GROUPS[tag] || 'Suggested tag',
      }));
  }

  async function fetchRemoteSuggestions(query, mode, token) {
    if (typeof Config === 'undefined' || typeof SearchCache === 'undefined') return [];

    const params = new URLSearchParams({
      order: 'desc',
      sort: 'popular',
      site: Config.SITE,
      pagesize: String(Math.max(SUGGEST_LIMIT * 2, 20)),
      inname: toTagLookupQuery(query),
    });

    const url = `${Config.SE_API}/tags?${params.toString()}`;
    const response = await SearchCache.cachedFetch(url, Config.SEARCH_TIMEOUT_MS);

    if (_requestToken[mode] !== token) return null;
    if (!response.ok) return [];

    const data = await response.json();
    if (_requestToken[mode] !== token) return null;

    const seen = new Set();
    const suggestions = [];
    for (const item of data.items || []) {
      const name = String(item.name || '').trim();
      if (!name || _selected[mode].has(name) || !matchesQuery(name, query) || seen.has(name)) continue;
      seen.add(name);
      suggestions.push({
        name,
        count: Number(item.count) || 0,
        meta: item.count ? `${formatCount(item.count)} questions` : 'Math StackExchange',
      });
    }

    return suggestions;
  }

  function mergeSuggestions(remoteSuggestions, fallbackSuggestions) {
    const merged = [];
    const seen = new Set();

    for (const suggestion of remoteSuggestions || []) {
      if (seen.has(suggestion.name)) continue;
      seen.add(suggestion.name);
      merged.push(suggestion);
      if (merged.length >= SUGGEST_LIMIT) return merged;
    }

    for (const suggestion of fallbackSuggestions || []) {
      if (seen.has(suggestion.name)) continue;
      seen.add(suggestion.name);
      merged.push(suggestion);
      if (merged.length >= SUGGEST_LIMIT) break;
    }

    return merged;
  }

  function selectTag(tag, mode) {
    if (!tag || _selected[mode].has(tag)) return;
    _selected[mode].add(tag);

    const { input } = getNodes(mode);
    if (input) input.value = '';

    renderChips(mode);
    closeDropdown(mode);

    if (input) input.focus();
  }

  function showSuggestions(mode) {
    const { input } = getNodes(mode);
    if (!input) return;

    const query = normalizeQuery(input.value);
    clearTimeout(_debounceTimers[mode]);
    _requestToken[mode] += 1;
    const token = _requestToken[mode];

    if (!query) {
      closeDropdown(mode);
      return;
    }

    const fallbackSuggestions = buildFallbackSuggestions(query, mode);
    renderLoading(mode, fallbackSuggestions, query);

    _debounceTimers[mode] = window.setTimeout(async () => {
      try {
        const remoteSuggestions = await fetchRemoteSuggestions(query, mode, token);
        if (remoteSuggestions === null || token !== _requestToken[mode]) return;

        const merged = mergeSuggestions(remoteSuggestions, fallbackSuggestions);
        renderSuggestions(mode, merged, query);
      } catch (_) {
        if (token !== _requestToken[mode]) return;
        if (fallbackSuggestions.length > 0) {
          renderSuggestions(mode, fallbackSuggestions, query);
        } else {
          renderEmpty(mode, 'No matching tags');
        }
      }
    }, SUGGEST_DEBOUNCE_MS);
  }

  function handleKeydown(event, mode) {
    const { input, dropdown } = getNodes(mode);
    if (!input || !dropdown) return;

    if (event.key === 'Backspace' && !input.value.trim() && _selected[mode].size > 0) {
      const tags = Array.from(_selected[mode]);
      _selected[mode].delete(tags[tags.length - 1]);
      renderChips(mode);
      return;
    }

    if (!dropdown.classList.contains('open') || !_suggestions[mode].length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      _activeIdx[mode] = Math.min(_activeIdx[mode] + 1, _suggestions[mode].length - 1);
      updateActiveItem(mode);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      _activeIdx[mode] = Math.max(_activeIdx[mode] - 1, 0);
      updateActiveItem(mode);
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      if (_activeIdx[mode] >= 0 && _activeIdx[mode] < _suggestions[mode].length) {
        event.preventDefault();
        selectTag(_suggestions[mode][_activeIdx[mode]].name, mode);
      }
      return;
    }

    if (event.key === 'Escape') {
      closeDropdown(mode);
    }
  }

  function wireMode(mode) {
    const { input, root } = getNodes(mode);
    if (!input || !root) return;

    input.addEventListener('input', () => {
      showSuggestions(mode);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) showSuggestions(mode);
    });

    input.addEventListener('keydown', (event) => {
      handleKeydown(event, mode);
    });

    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) {
        closeDropdown(mode);
      }
    });
  }

  function getSelected(mode) {
    const set = _selected[mode || 'text'];
    return set.size ? Array.from(set).join(';') : '';
  }

  function getSelectedArray(mode) {
    return Array.from(_selected[mode || 'text']);
  }

  function clearSelection(mode) {
    _selected[mode].clear();
    renderChips(mode);
    closeDropdown(mode);
  }

  function init() {
    wireMode('text');
    wireMode('latex');
  }

  return {
    init,
    getSelected,
    getSelectedArray,
    clearSelection,
    TAG_GROUPS,
    ALL_TAGS: FALLBACK_TAGS,
  };
})();

function initTagSelectors() {
  TagSelector.init();
}
