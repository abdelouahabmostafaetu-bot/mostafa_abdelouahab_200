/* ================================================================
   ai-ui.js — UI components for AI-powered features
   Renders: AI summary panels, quality checks, suggestions,
   formula explanations, sort controls, and refresh buttons.
   ================================================================ */

const AIUI = (function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     AI SUMMARY PANEL (appears inside expanded result)
     ═══════════════════════════════════════════════════════════════ */

  function renderAISummaryButton(questionId) {
    return `<button class="ai-action-btn ai-summarize-btn" data-qid="${questionId}" title="AI Summary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      AI Summary
    </button>`;
  }

  function renderAISummary(data) {
    if (!data || !data.summary) return '';
    return `<div class="ai-summary-panel">
      <div class="ai-summary-header">
        <span class="ai-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          Claude Opus 4.6
        </span>
        <span class="ai-summary-label">AI Summary</span>
      </div>
      <div class="ai-summary-body">${formatMathText(data.summary)}</div>
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     QUALITY CHECK PANEL
     ═══════════════════════════════════════════════════════════════ */

  function renderQualityCheck(data) {
    if (!data) return '';
    const score = data.quality_score || 0;
    const cls = score >= 70 ? 'qc-high' : score >= 40 ? 'qc-mid' : 'qc-low';

    let refinedHtml = '';
    if (data.refined_queries && data.refined_queries.length > 0) {
      refinedHtml = `<div class="qc-refined">
        <span class="qc-refined-label">Try also:</span>
        ${data.refined_queries.map(q =>
          `<span class="qc-refined-chip" data-query="${escHtml(q)}">${escHtml(q)}</span>`
        ).join('')}
      </div>`;
    }

    let missingHtml = '';
    if (data.missing_topics && data.missing_topics.length > 0) {
      missingHtml = `<div class="qc-missing">
        <span class="qc-missing-label">Not well covered:</span>
        ${data.missing_topics.map(t => `<span class="qc-missing-tag">${escHtml(t)}</span>`).join('')}
      </div>`;
    }

    return `<div class="ai-quality-panel ${cls}">
      <div class="qc-header">
        <span class="ai-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          AI Quality Check
        </span>
        <span class="qc-score">${score}/100</span>
      </div>
      <div class="qc-meter"><div class="qc-fill" style="width:${score}%"></div></div>
      <p class="qc-assessment">${escHtml(data.assessment || '')}</p>
      ${data.best_result_reason ? `<p class="qc-best"><strong>Best match:</strong> ${escHtml(data.best_result_reason)}</p>` : ''}
      ${data.sort_recommendation ? `<p class="qc-sort-tip">Recommended sort: <strong>${escHtml(data.sort_recommendation)}</strong></p>` : ''}
      ${missingHtml}
      ${refinedHtml}
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     AI SUGGESTIONS PANEL
     ═══════════════════════════════════════════════════════════════ */

  function renderAISuggestions(data) {
    if (!data || !data.suggestions || data.suggestions.length === 0) return '';

    const diffColors = { basic: 'sug-basic', intermediate: 'sug-mid', advanced: 'sug-adv' };

    return `<div class="ai-suggestions-panel">
      <div class="ai-sug-header">
        <span class="ai-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          AI Suggestions
        </span>
      </div>
      <div class="ai-sug-list">
        ${data.suggestions.map(s => {
          const cls = diffColors[s.difficulty] || 'sug-basic';
          return `<div class="ai-sug-item ${cls}" data-query="${escHtml(s.query)}">
            <span class="ai-sug-query">${escHtml(s.query)}</span>
            <span class="ai-sug-reason">${escHtml(s.reason || '')}</span>
            <span class="ai-sug-diff">${escHtml(s.difficulty || '')}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     FORMULA EXPLANATION PANEL
     ═══════════════════════════════════════════════════════════════ */

  function renderFormulaExplanation(data) {
    if (!data || !data.explanation) return '';
    return `<div class="ai-explain-panel">
      <div class="ai-explain-header">
        <span class="ai-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          Formula Explanation
        </span>
      </div>
      <div class="ai-explain-body">${formatMathText(data.explanation)}</div>
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     REFRESH ANALYSIS PANEL
     ═══════════════════════════════════════════════════════════════ */

  function renderRefreshAnalysis(data) {
    if (!data) return '';
    const score = data.coverage_score || 0;

    let altHtml = '';
    if (data.alternative_queries && data.alternative_queries.length > 0) {
      altHtml = data.alternative_queries.map(q =>
        `<span class="refresh-alt-chip" data-query="${escHtml(q)}">${escHtml(q)}</span>`
      ).join('');
    }

    let tagHtml = '';
    if (data.recommended_tags && data.recommended_tags.length > 0) {
      tagHtml = data.recommended_tags.map(t =>
        `<span class="refresh-tag-chip">${escHtml(t)}</span>`
      ).join('');
    }

    return `<div class="ai-refresh-panel">
      <div class="refresh-header">
        <span class="ai-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          Refresh Analysis
        </span>
        <span class="refresh-coverage">Coverage: ${score}%</span>
      </div>
      ${data.missing_angles && data.missing_angles.length > 0
        ? `<div class="refresh-missing"><strong>Missing angles:</strong> ${data.missing_angles.map(a => escHtml(a)).join(', ')}</div>`
        : ''}
      ${altHtml ? `<div class="refresh-alts"><strong>Try:</strong> ${altHtml}</div>` : ''}
      ${tagHtml ? `<div class="refresh-tags"><strong>Tags:</strong> ${tagHtml}</div>` : ''}
      ${data.tip ? `<div class="refresh-tip">${escHtml(data.tip)}</div>` : ''}
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     ADVANCED SORT TOOLBAR
     ═══════════════════════════════════════════════════════════════ */

  function renderSortToolbar(currentSort, resultCount) {
    const strategies = SortEngine.getStrategies();
    const primary = strategies.slice(0, 6);
    const more = strategies.slice(6);

    return `<div class="sort-toolbar" id="sortToolbar">
      <div class="sort-toolbar-row">
        <span class="sort-label">Sort:</span>
        <div class="sort-pills">
          ${primary.map(s => `
            <button class="sort-pill ${s.key === currentSort ? 'active' : ''}"
                    data-sort="${s.key}" title="${s.desc}">
              <span class="sort-pill-icon">${s.icon}</span>
              <span class="sort-pill-text">${s.label}</span>
            </button>
          `).join('')}
          <div class="sort-more-wrap">
            <button class="sort-pill sort-more-btn" title="More sorting options">
              <span class="sort-pill-icon">⋯</span>
              <span class="sort-pill-text">More</span>
            </button>
            <div class="sort-more-dropdown" id="sortMoreDropdown">
              ${more.map(s => `
                <div class="sort-more-item ${s.key === currentSort ? 'active' : ''}"
                     data-sort="${s.key}" title="${s.desc}">
                  <span>${s.icon}</span>
                  <span>${s.label}</span>
                  <span class="sort-more-desc">${s.desc}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <span class="sort-count">${resultCount} results</span>
      </div>
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     AI ACTION BAR (below search box)
     ═══════════════════════════════════════════════════════════════ */

  function renderAIActionBar() {
    return `<div class="ai-action-bar" id="aiActionBar">
      <button class="ai-bar-btn" id="aiQualityBtn" title="AI Quality Check">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        Quality Check
      </button>
      <button class="ai-bar-btn" id="aiSuggestBtn" title="AI Suggestions">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        Suggestions
      </button>
      <button class="ai-bar-btn" id="aiRefreshBtn" title="Refresh & Analyze">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        Refresh
      </button>
      <div class="ai-toggle-wrap">
        <label class="ai-toggle" title="Toggle AI features">
          <input type="checkbox" id="aiToggle" checked>
          <span class="ai-toggle-slider"></span>
        </label>
        <span class="ai-toggle-label">AI</span>
      </div>
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════════ */

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatMathText(text) {
    // Basic markdown-to-HTML for AI responses
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  /* ═══════════════════════════════════════════════════════════════
     INIT: Wire up event handlers for AI/sort UI
     ═══════════════════════════════════════════════════════════════ */

  function initSortToolbar(onSortChange) {
    document.addEventListener('click', (e) => {
      // Sort pills
      const pill = e.target.closest('.sort-pill[data-sort]');
      if (pill) {
        const sort = pill.dataset.sort;
        document.querySelectorAll('.sort-pill').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.sort-more-item').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        onSortChange(sort);
        return;
      }

      // Sort more dropdown items
      const moreItem = e.target.closest('.sort-more-item[data-sort]');
      if (moreItem) {
        const sort = moreItem.dataset.sort;
        document.querySelectorAll('.sort-pill').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.sort-more-item').forEach(p => p.classList.remove('active'));
        moreItem.classList.add('active');
        onSortChange(sort);
        // Close dropdown
        const dd = document.getElementById('sortMoreDropdown');
        if (dd) dd.classList.remove('open');
        return;
      }

      // Sort more button toggle
      const moreBtn = e.target.closest('.sort-more-btn');
      if (moreBtn) {
        const dd = document.getElementById('sortMoreDropdown');
        if (dd) dd.classList.toggle('open');
        return;
      }

      // Close sort dropdown on outside click
      const dd = document.getElementById('sortMoreDropdown');
      if (dd && dd.classList.contains('open')) {
        dd.classList.remove('open');
      }

      // AI suggestion clicks
      const sugItem = e.target.closest('.ai-sug-item[data-query]');
      if (sugItem) {
        const query = sugItem.dataset.query;
        if (State.searchMode === 'latex') {
          DOM.latexInput.value = query;
          DOM.latexInput.dispatchEvent(new Event('input'));
          searchLatex();
        } else {
          DOM.query.value = query;
          searchText();
        }
        return;
      }

      // Refined query chip clicks
      const refinedChip = e.target.closest('.qc-refined-chip[data-query]');
      if (refinedChip) {
        DOM.query.value = refinedChip.dataset.query;
        searchText();
        return;
      }

      // Refresh alt chip clicks
      const refreshChip = e.target.closest('.refresh-alt-chip[data-query]');
      if (refreshChip) {
        DOM.query.value = refreshChip.dataset.query;
        searchText();
        return;
      }
    });
  }

  return {
    renderAISummaryButton,
    renderAISummary,
    renderQualityCheck,
    renderAISuggestions,
    renderFormulaExplanation,
    renderRefreshAnalysis,
    renderSortToolbar,
    renderAIActionBar,
    initSortToolbar
  };
})();
