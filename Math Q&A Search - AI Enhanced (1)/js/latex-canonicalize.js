/* ================================================================
   latex-canonicalize.js — LaTeX Normalization & Canonicalization
   ================================================================
   Inspired by ARQMath Lab (CLEF 2020-2022).

   Before comparing or searching formulas, we reduce them to a
   canonical form so that equivalent but differently-written
   formulas produce the same (or very similar) representations.

   Canonicalization rules:
     1. Whitespace normalization
     2. Spacing command removal (\, \; \! \quad etc.)
     3. Delimiter normalization (\left \right stripping)
     4. d/dx → \mathrm{d}x equivalence
     5. Trig function notation (\cos(x) ↔ \cos x)
     6. Common aliases (\ne → \neq, \ge → \geq, etc.)
     7. Redundant brace removal
     8. Operator ordering (commutative terms)
     9. Equivalent notation merging
   ================================================================ */

const LaTeXCanon = (() => {

  /* ── Step 1: Spacing & whitespace ── */
  function normalizeWhitespace(tex) {
    return tex
      .replace(/\\[,;:!]\s*/g, ' ')              // thin/medium/thick space → single space
      .replace(/\\(?:quad|qquad|hspace|vspace)\s*(?:\{[^}]*\})?/g, ' ')
      .replace(/\\(?:hfill|vfill|enspace|thinspace|medspace|thickspace|negmedspace|negthickspace|negthinspace)/g, ' ')
      .replace(/~+/g, ' ')                       // non-breaking space
      .replace(/\s+/g, ' ')                       // collapse whitespace
      .trim();
  }

  /* ── Step 1b: Semantic space normalization ──
     Ensures consistent spacing so that e.g.
       \int_0^1 \ln(\sin(x)) dx  ===  \int_0^1\ln(\sin(x))dx
     Works by inserting canonical spaces at token boundaries,
     then collapsing to single spaces. */
  function normalizeSpacing(tex) {
    let t = tex;
    // Insert space after closing brace/paren/bracket before \command
    t = t.replace(/(\}|\)|\])(?=\\[a-zA-Z])/g, '$1 ');
    // Insert space after } before a letter (e.g. }dx → } dx)
    t = t.replace(/(\})(?=[a-zA-Z])/g, '$1 ');
    // Insert space before standalone differential d[xyztsr] at end or before \, ), }
    t = t.replace(/([^\\a-zA-Z])d([xyztsr])(?=\s*[\\})\]$]|\s*$)/g, '$1 d$2');
    // Insert space after superscript/subscript close brace before next token
    t = t.replace(/(\^\{[^}]*\}|_\{[^}]*\})(?=[a-zA-Z\\(])/g, '$1 ');
    // Insert space after a bare superscript/subscript digit before \command or letter
    t = t.replace(/(\^[0-9]|_[0-9])(?=[a-zA-Z\\])/g, '$1 ');
    // Insert space between consecutive \commands without space
    t = t.replace(/(\\[a-zA-Z]+)(?=\\[a-zA-Z])/g, '$1 ');
    // Collapse multiple spaces
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }

  /* ── Step 2: Delimiter normalization ── */
  function normalizeDelimiters(tex) {
    return tex
      .replace(/\\left\s*/g, '')
      .replace(/\\right\s*/g, '')
      .replace(/\\big\s*/gi, '')
      .replace(/\\Big\s*/gi, '')
      .replace(/\\bigg\s*/gi, '')
      .replace(/\\Bigg\s*/gi, '')
      .replace(/\\middle\s*/g, '');
  }

  /* ── Step 3: Command aliases ── */
  function normalizeAliases(tex) {
    const aliases = [
      [/\\ne(?![a-zA-Z])/g,       '\\neq'],
      [/\\le(?![a-zA-Z])/g,       '\\leq'],
      [/\\ge(?![a-zA-Z])/g,       '\\geq'],
      [/\\to(?![a-zA-Z])/g,       '\\rightarrow'],
      [/\\gets(?![a-zA-Z])/g,     '\\leftarrow'],
      [/\\iff(?![a-zA-Z])/g,      '\\Leftrightarrow'],
      [/\\implies(?![a-zA-Z])/g,  '\\Rightarrow'],
      [/\\land(?![a-zA-Z])/g,     '\\wedge'],
      [/\\lor(?![a-zA-Z])/g,      '\\vee'],
      [/\\lnot(?![a-zA-Z])/g,     '\\neg'],
      [/\\emptyset(?![a-zA-Z])/g, '\\varnothing'],
      [/\\varepsilon(?![a-zA-Z])/g, '\\epsilon'],
      [/\\vartheta(?![a-zA-Z])/g,   '\\theta'],
      [/\\varphi(?![a-zA-Z])/g,     '\\phi'],
      [/\\tfrac/g, '\\frac'],
      [/\\dfrac/g, '\\frac'],
      [/\\dbinom/g, '\\binom'],
      [/\\tbinom/g, '\\binom'],
      [/\\operatorname\{(\w+)\}/g, '\\$1'],   // \operatorname{sin} → \sin
    ];
    for (const [re, rep] of aliases) tex = tex.replace(re, rep);
    return tex;
  }

  /* ── Step 4: Differential normalization ── */
  function normalizeDifferential(tex) {
    // Normalize all differential forms to plain 'dx'
    // Ensure a space before the differential
    return tex
      .replace(/\\mathrm\{d\}\s*/g, 'd')
      .replace(/\\text\{d\}\s*/g, 'd')
      .replace(/\\mathop\{d\}\s*/g, 'd')
      .replace(/([^\\a-zA-Z\s])d([xyztsr])(?=[\s\\}$]|$)/g, '$1 d$2');
  }

  /* ── Step 5: Function notation — strip parens from trig calls ── */
  function normalizeFunctions(tex) {
    const FN = 'sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|arcsin|arccos|arctan|ln|log|exp';
    const re = new RegExp('\\\\(' + FN + ')\\s*\\(([^)]*)\\)', 'g');
    return tex.replace(re, '\\$1 $2');
  }

  /* ── Step 6: Redundant braces ── */
  function removeRedundantBraces(tex) {
    // {X} → X  when X is a single token (letter, digit, or \command)
    // but NOT when braces are required arguments (preceded by a \command letter)
    let result = tex;
    let prev;
    do {
      prev = result;
      // Only strip braces when the char before '{' is NOT [a-zA-Z] or '}'
      // This preserves \frac{a}{b}, \sqrt{x}, and consecutive arguments
      result = result.replace(/(^|[^a-zA-Z}])\{(\\[a-zA-Z]+|[a-zA-Z0-9])\}/g, '$1$2');
    } while (result !== prev);
    return result;
  }

  /* ── Step 7: Decoration / styling removal ── */
  function removeDecorations(tex) {
    return tex
      .replace(/\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle)\s*/g, '')
      .replace(/\\(?:color|textcolor)\s*\{[^}]*\}\s*/g, '')
      .replace(/\\(?:boxed)\s*\{([^}]*)\}/g, '$1')
      .replace(/\\(?:tag|label)\s*\{[^}]*\}/g, '')
      .replace(/\\phantom\s*\{[^}]*\}/g, '')
      .replace(/\\hphantom\s*\{[^}]*\}/g, '')
      .replace(/\\vphantom\s*\{[^}]*\}/g, '');
  }

  /* ── Step 8: Environment normalization ── */
  function normalizeEnvironments(tex) {
    // pmatrix / bmatrix / vmatrix → matrix
    return tex
      .replace(/\\begin\{[pbvBV]matrix\}/g, '\\begin{matrix}')
      .replace(/\\end\{[pbvBV]matrix\}/g, '\\end{matrix}');
  }

  /* ════════════════════════════════════════
     MAIN: full canonicalization pipeline
     ════════════════════════════════════════ */
  function canonicalize(tex) {
    if (!tex || typeof tex !== 'string') return '';
    let t = tex;
    t = normalizeWhitespace(t);
    t = normalizeSpacing(t);              // semantic space normalization
    t = normalizeDelimiters(t);
    t = normalizeAliases(t);
    t = normalizeDifferential(t);
    t = normalizeFunctions(t);
    t = removeDecorations(t);
    t = normalizeEnvironments(t);
    t = removeRedundantBraces(t);
    t = normalizeWhitespace(t);           // final cleanup
    return t;
  }

  /* ════════════════════════════════════════
     NORMALIZE FOR SEARCH
     Lighter normalization suitable for building search queries.
     Keeps some structure for SE text matching.
     ════════════════════════════════════════ */
  function normalizeForSearch(tex) {
    if (!tex || typeof tex !== 'string') return '';
    let t = tex;
    t = normalizeWhitespace(t);
    t = normalizeSpacing(t);              // semantic space normalization
    t = normalizeDelimiters(t);
    t = normalizeAliases(t);
    t = removeDecorations(t);
    t = normalizeWhitespace(t);
    return t;
  }

  /* ════════════════════════════════════════
     FINGERPRINT
     A compact string for fast equality checking.
     Strips all spacing, converts to lowercase.
     ════════════════════════════════════════ */
  function fingerprint(tex) {
    const c = canonicalize(tex);
    return c.replace(/\s+/g, '').toLowerCase();
  }

  return { canonicalize, normalizeForSearch, normalizeSpacing, fingerprint };
})();
