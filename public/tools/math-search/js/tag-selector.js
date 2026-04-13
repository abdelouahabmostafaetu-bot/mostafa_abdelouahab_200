/* ================================================================
   tag-selector.js — MSE-style tag autocomplete
   Type a letter → suggestions appear. Type more → narrows down.
   Click a suggestion to add it. Click × to remove.
   ================================================================ */

const TagSelector = (function () {

  /* ── All MSE math tags grouped by topic ── */
  const TAG_GROUPS = [
    { label: 'Calculus',
      tags: ['calculus', 'integration', 'definite-integrals', 'improper-integrals',
             'indefinite-integrals', 'limits', 'derivatives', 'multivariable-calculus',
             'partial-derivative', 'differential-equations', 'ordinary-differential-equations',
             'partial-differential-equations', 'sequences-and-series', 'power-series',
             'taylor-expansion', 'fourier-analysis', 'laplace-transform'] },
    { label: 'Algebra',
      tags: ['linear-algebra', 'abstract-algebra', 'matrices', 'eigenvalues-eigenvectors',
             'group-theory', 'ring-theory', 'field-theory', 'polynomials',
             'systems-of-equations', 'vector-spaces', 'determinant', 'inequality'] },
    { label: 'Analysis',
      tags: ['real-analysis', 'complex-analysis', 'functional-analysis', 'measure-theory',
             'metric-spaces', 'continuity', 'convergence-divergence', 'uniform-convergence',
             'lebesgue-integral', 'banach-spaces', 'hilbert-spaces'] },
    { label: 'Discrete',
      tags: ['combinatorics', 'probability', 'statistics', 'number-theory',
             'prime-numbers', 'graph-theory', 'recurrence-relations',
             'generating-functions', 'permutations', 'binomial-coefficients',
             'modular-arithmetic', 'elementary-number-theory'] },
    { label: 'Geometry',
      tags: ['geometry', 'euclidean-geometry', 'analytic-geometry', 'differential-geometry',
             'trigonometry', 'topology', 'general-topology', 'algebraic-topology',
             'algebraic-geometry', 'projective-geometry', 'circles', 'conic-sections'] },
    { label: 'Logic',
      tags: ['logic', 'set-theory', 'proof-writing', 'proof-verification',
             'induction', 'axiom-of-choice', 'cardinals', 'order-theory',
             'first-order-logic', 'propositional-calculus'] },
    { label: 'Applied',
      tags: ['optimization', 'numerical-methods', 'special-functions',
             'gamma-function', 'zeta-function', 'beta-function', 'elliptic-integrals',
             'asymptotics', 'closed-form', 'contest-math', 'recreational-mathematics',
             'reference-request', 'soft-question'] }
  ];

  // Build flat lookup: tag → group label
  const _tagGroup = {};
  const ALL_TAGS = [];
  for (const g of TAG_GROUPS) {
    for (const t of g.tags) {
      ALL_TAGS.push(t);
      _tagGroup[t] = g.label;
    }
  }

  // Per-mode state
  const _selected = { text: new Set(), latex: new Set() };
  let _activeIdx = { text: -1, latex: -1 };

  /* ── Highlight matching part of tag name ── */
  function highlightMatch(tag, query) {
    if (!query) return tag;
    const idx = tag.indexOf(query);
    if (idx === -1) return tag;
    return tag.slice(0, idx)
      + '<span class="tag-match">' + tag.slice(idx, idx + query.length) + '</span>'
      + tag.slice(idx + query.length);
  }

  /* ── Render selected chips ── */
  function renderChips(mode) {
    const container = document.getElementById(mode === 'text' ? 'textTagChips' : 'latexTagChips');
    if (!container) return;
    container.innerHTML = '';
    for (const tag of _selected[mode]) {
      const chip = document.createElement('span');
      chip.className = 'tag-selected-chip';
      chip.innerHTML = tag + ' <span class="tag-remove" data-tag="' + tag + '">&times;</span>';
      chip.querySelector('.tag-remove').addEventListener('click', () => {
        _selected[mode].delete(tag);
        renderChips(mode);
      });
      container.appendChild(chip);
    }
  }

  /* ── Show dropdown suggestions ── */
  function showSuggestions(mode) {
    const input = document.getElementById(mode === 'text' ? 'textTagInput' : 'latexTagInput');
    const dropdown = document.getElementById(mode === 'text' ? 'textTagDropdown' : 'latexTagDropdown');
    if (!input || !dropdown) return;

    const q = input.value.trim().toLowerCase();
    dropdown.innerHTML = '';
    _activeIdx[mode] = -1;

    if (!q) {
      dropdown.classList.remove('open');
      return;
    }

    // Filter: match anywhere in tag name, exclude already selected
    const matches = ALL_TAGS.filter(t => t.includes(q) && !_selected[mode].has(t));

    // Sort: starts-with first, then contains
    matches.sort((a, b) => {
      const aStarts = a.startsWith(q) ? 0 : 1;
      const bStarts = b.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.localeCompare(b);
    });

    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="tag-dropdown-empty">No matching tags</div>';
      dropdown.classList.add('open');
      return;
    }

    for (let i = 0; i < Math.min(matches.length, 12); i++) {
      const tag = matches[i];
      const item = document.createElement('div');
      item.className = 'tag-dropdown-item';
      item.dataset.tag = tag;
      item.innerHTML = highlightMatch(tag, q)
        + '<span class="tag-group-hint">' + (_tagGroup[tag] || '') + '</span>';
      item.addEventListener('click', () => selectTag(tag, mode));
      dropdown.appendChild(item);
    }

    dropdown.classList.add('open');
  }

  /* ── Select a tag ── */
  function selectTag(tag, mode) {
    _selected[mode].add(tag);
    const input = document.getElementById(mode === 'text' ? 'textTagInput' : 'latexTagInput');
    const dropdown = document.getElementById(mode === 'text' ? 'textTagDropdown' : 'latexTagDropdown');
    if (input) input.value = '';
    if (dropdown) { dropdown.innerHTML = ''; dropdown.classList.remove('open'); }
    renderChips(mode);
    if (input) input.focus();
  }

  /* ── Keyboard navigation ── */
  function handleKeydown(e, mode) {
    const dropdown = document.getElementById(mode === 'text' ? 'textTagDropdown' : 'latexTagDropdown');
    if (!dropdown || !dropdown.classList.contains('open')) return;
    const items = dropdown.querySelectorAll('.tag-dropdown-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _activeIdx[mode] = Math.min(_activeIdx[mode] + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('active', i === _activeIdx[mode]));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _activeIdx[mode] = Math.max(_activeIdx[mode] - 1, 0);
      items.forEach((el, i) => el.classList.toggle('active', i === _activeIdx[mode]));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (_activeIdx[mode] >= 0 && _activeIdx[mode] < items.length) {
        selectTag(items[_activeIdx[mode]].dataset.tag, mode);
      }
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('open');
    }
  }

  /* ── Wire up one mode ── */
  function wireMode(mode) {
    const input = document.getElementById(mode === 'text' ? 'textTagInput' : 'latexTagInput');
    if (!input) return;
    input.addEventListener('input', () => showSuggestions(mode));
    input.addEventListener('keydown', (e) => handleKeydown(e, mode));
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById(mode === 'text' ? 'textTagDropdown' : 'latexTagDropdown');
      if (dropdown && !e.target.closest('.tag-input-wrap')) {
        dropdown.classList.remove('open');
      }
    });
  }

  /* ── Public API ── */
  function getSelected(mode) {
    const set = _selected[mode || 'text'];
    return set.size ? [...set].join(';') : '';
  }
  function getSelectedArray(mode) {
    return [..._selected[mode || 'text']];
  }
  function clearSelection(mode) {
    _selected[mode].clear();
    renderChips(mode);
  }
  function init() {
    wireMode('text');
    wireMode('latex');
  }

  return { init, getSelected, getSelectedArray, clearSelection, TAG_GROUPS, ALL_TAGS };
})();

function initTagSelectors() {
  TagSelector.init();
}
