/* ================================================================
   latex-editor.js — Toolbar insert, live MathJax preview
   ================================================================ */

let _previewTimer = null;

/* ── Insert LaTeX snippet at cursor ── */
function insertLatex(snippet) {
  const ta    = DOM.latexInput;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  ta.value = ta.value.substring(0, start) + snippet + ta.value.substring(end);
  ta.selectionStart = ta.selectionEnd = start + snippet.length;
  ta.focus();
  updateLatexPreview();
}

/* ── Live preview with debounce ── */
function initLatexPreview() {
  DOM.latexInput.addEventListener('input', () => {
    clearTimeout(_previewTimer);
    _previewTimer = setTimeout(updateLatexPreview, Config.DEBOUNCE_MS);
  });
}

function updateLatexPreview() {
  const tex = DOM.latexInput.value.trim();
  if (!tex) {
    DOM.latexPreview.innerHTML = '<span class="placeholder-text">Your formula will appear here…</span>';
    return;
  }

  // Clear previous MathJax state for this node to avoid stale cache
  if (window.MathJax && MathJax.typesetClear) {
    MathJax.typesetClear([DOM.latexPreview]);
  }

  DOM.latexPreview.innerHTML = '$$' + tex + '$$';

  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([DOM.latexPreview]).catch(() => {
      DOM.latexPreview.innerHTML = '<span style="color:#ef4444">⚠ Render error — check your LaTeX</span>';
    });
  }
}
