/* ================================================================
   search-latex.js — Advanced LaTeX formula search
   ================================================================
   Multi-engine search combining:
     1. Approach Zero API  — structural formula search (primary)
     2. SE /search/excerpts — text search Q+A bodies (secondary)
     3. SE /search/advanced — tag+keyword metadata (secondary)
     4. SE /similar         — similar question titles (tertiary)
     5. Smart Query Decomposition — breaks complex formulas into
        subformula levels for broader/narrower search
     6. Maximum Subtree Similarity re-ranking (client-side)
     7. Result caching via SearchCache

   ARQMath-inspired enhancements (CLEF 2020-2022):
     8. LaTeX Canonicalization — normalize before search/compare
     9. Tangent-S symbol pair tokenization — granular matching
    10. OPT path tokens — structural path comparison
    11. TF-IDF weighted scoring — importance-aware ranking
    12. Notation variant generation — handle LaTeX diversity
    13. Subexpression query extraction — partial structure search

   Advanced search strategies:
    14. Deep brace parsing — correct handling of nested braces
    15. Distinctive sub-expression extraction — finds unique parts
    16. Google site-search — captures results missed by other engines
    17. AZ notation variants — sends multiple LaTeX forms to AZ
    18. MathOverflow cross-search — finds related MO questions
    19. Formula decomposition into readable queries

   Professional upgrades:
    20. Multi-page AZ scanning — fetches pages 1-3 for deeper coverage
    21. AZ graceful degradation — cooldown on failure, auto-retry
    22. Related/linked chain scanning — discovers connected questions
    23. Body-content LaTeX matching — scans bodies for exact formulas
    24. Answer body formula extraction — searches answer LaTeX too
    25. Multi-source concordance bonus — 3+ engine agreement boost
    26. AZ structural score integration in final ranking

   Results from all engines are merged, deduplicated, scored by
   multi-signal structural similarity, and presented with analytics.
   ================================================================ */

let _latexSearchId = 0;
let _lastSearchStats = null;

function initLatexSearch() {
  DOM.latexSearchBtn.addEventListener('click', () => { State.currentPage = 1; searchLatex(); });
  DOM.latexKeywords.addEventListener('keydown', e => {
    if (e.key === 'Enter') { State.currentPage = 1; searchLatex(); }
  });
  DOM.latexInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) { State.currentPage = 1; searchLatex(); }
  });
}

/* ================================================================
   APPROACH ZERO API
   ================================================================
   https://approach0.xyz is a math-aware search engine that indexes
   MSE. It accepts LaTeX and returns structurally matched results.
   ================================================================ */

let _azAvailable = true;       // track AZ health
let _azLastFailure = 0;        // ms timestamp of last failure
const AZ_COOLDOWN = 60000;     // 60s cooldown after failure

async function searchApproachZero(tex, page) {
  const AZ_API = 'https://approach0.xyz/api/search';

  // Skip if AZ was recently down (graceful degradation)
  if (!_azAvailable && Date.now() - _azLastFailure < AZ_COOLDOWN) {
    return null;
  }

  try {
    const params = new URLSearchParams({ q: tex, p: page || 1 });
    const resp = await fetchWithTimeout(`${AZ_API}?${params}`, 12000);
    if (!resp.ok) {
      _azAvailable = false;
      _azLastFailure = Date.now();
      return null;
    }
    const data = await resp.json();
    if (!data || data.ret_code !== 0) return null;
    _azAvailable = true;  // Mark healthy
    return data;
  } catch (_) {
    _azAvailable = false;
    _azLastFailure = Date.now();
    return null;
  }
}

/**
 * Multi-page AZ scanning — fetches pages 1..maxPages in parallel.
 * Returns combined hits from all pages, deduplicated by URL.
 */
async function searchApproachZeroMultiPage(tex, maxPages) {
  maxPages = maxPages || 3;
  const pages = [];
  for (let p = 1; p <= maxPages; p++) pages.push(p);
  const results = await Promise.all(pages.map(p => searchApproachZero(tex, p)));
  const seen = new Set();
  const combined = { ret_code: 0, hits: [] };
  for (const data of results) {
    if (!data || !data.hits) continue;
    for (const hit of data.hits) {
      const key = hit.url || hit.title;
      if (!seen.has(key)) {
        seen.add(key);
        combined.hits.push(hit);
      }
    }
  }
  return combined.hits.length > 0 ? combined : null;
}

function normalizeAZResults(azData) {
  if (!azData || !azData.hits) return [];
  return azData.hits.map(hit => ({
    question_id     : extractQidFromUrl(hit.url),
    title           : hit.title || 'Untitled',
    link            : hit.url || '#',
    score           : hit.score ?? 0,
    answer_count    : 0,
    view_count      : 0,
    creation_date   : null,
    accepted_answer_id: null,
    tags            : [],
    owner           : {},
    excerpt         : hit.snippet || '',
    item_type       : 'question',
    _source         : 'approach-zero',
    _azScore        : hit.score ?? 0,
  }));
}

function extractQidFromUrl(url) {
  if (!url) return 0;
  const m = url.match(/questions\/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/* ================================================================
   SMART QUERY DECOMPOSITION
   ================================================================
   Break complex LaTeX into multiple sub-formula "levels":
     Level 0: Full formula
     Level 1: Major sub-expressions (\frac, integrand)
     Level 2: Individual components (numerator, denominator, bounds)

   Each level generates its own SE query so partial structural
   matches still surface.
   ================================================================ */

function decomposeFormula(tex) {
  const levels = [{ level: 0, tex: tex, label: 'full formula' }];
  const parts = [];

  // \frac{...}{...} blocks (using deep brace parser for arbitrary nesting)
  const deepFracs = extractFractionsDeep(tex);
  for (const frac of deepFracs) {
    parts.push({ tex: frac.full, label: 'fraction' });
    // Also add numerator and denominator as separate components
    if (frac.numerator.length >= 4) {
      parts.push({ tex: frac.numerator, label: 'numerator' });
    }
    if (frac.denominator.length >= 4) {
      parts.push({ tex: frac.denominator, label: 'denominator' });
    }
  }

  // Integrand (use deep parser result if available)
  if (!deepFracs.length) {
    const intRe = /\\int[_^{}\d\\a-zA-Z ]*?(\\frac\s*\{(?:[^{}]|\{[^{}]*\})*\}\s*\{(?:[^{}]|\{[^{}]*\})*\})/;
    const intMatch = tex.match(intRe);
    if (intMatch && !parts.find(p => p.tex === intMatch[1])) {
      parts.push({ tex: intMatch[1], label: 'integrand' });
    }
  }

  // Components from brace groups
  const braces = extractBraceGroups(tex);
  const components = braces
    .filter(c => c.length >= 4 && !/^\d+$/.test(c) && !/^\\infty$/.test(c) && !/^[a-z]$/.test(c))
    .sort((a, b) => b.length - a.length);

  parts.forEach(p => levels.push({ level: 1, ...p }));
  components.slice(0, 3).forEach(c => {
    if (!levels.find(l => l.tex === c)) {
      levels.push({ level: 2, tex: c, label: 'component' });
    }
  });

  return levels;
}

/* ================================================================
   LATEX PARSING UTILITIES
   ================================================================ */

function extractBraceGroups(tex) {
  const groups = [];
  let depth = 0, start = -1;
  for (let i = 0; i < tex.length; i++) {
    if (tex[i] === '{') { if (depth === 0) start = i + 1; depth++; }
    else if (tex[i] === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const c = tex.substring(start, i).trim();
        if (c) groups.push(c);
        start = -1;
      }
    }
  }
  return groups;
}

/**
 * Match a brace group {…} starting at position pos, handling
 * arbitrary nesting depth. Returns { start, end, content, full }
 * or null if no valid brace group found.
 */
function matchBraceGroup(str, pos) {
  if (pos >= str.length || str[pos] !== '{') return null;
  let depth = 1;
  let i = pos + 1;
  while (i < str.length && depth > 0) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') depth--;
    i++;
  }
  if (depth !== 0) return null;
  return {
    start: pos,
    end: i,
    content: str.slice(pos + 1, i - 1),
    full: str.slice(pos, i),
  };
}

/**
 * Extract \frac{numerator}{denominator} blocks handling deeply
 * nested braces (e.g. \frac{\ln(1+x^{2+\sqrt{3}})}{1+x}).
 * Returns array of { full, numerator, denominator }.
 */
function extractFractionsDeep(tex) {
  const fracs = [];
  const re = /\\frac\s*/g;
  let m;
  while ((m = re.exec(tex)) !== null) {
    // Find opening brace of numerator
    let j = m.index + m[0].length;
    while (j < tex.length && tex[j] === ' ') j++;

    let numContent, numEnd;
    if (j < tex.length && tex[j] === '{') {
      // Braced numerator: \frac{...}{...}
      const num = matchBraceGroup(tex, j);
      if (!num) continue;
      numContent = num.content;
      numEnd = num.end;
    } else if (j < tex.length) {
      // Bare numerator: \frac1x or \frac ab or \frac\pi x
      if (tex[j] === '\\' && j + 1 < tex.length && /[a-zA-Z]/.test(tex[j + 1])) {
        // \command token: e.g. \frac\pi x
        const cmdMatch = tex.slice(j).match(/^\\[a-zA-Z]+/);
        numContent = cmdMatch[0];
        numEnd = j + cmdMatch[0].length;
      } else {
        // Single character: \frac1x or \frac ax
        numContent = tex[j];
        numEnd = j + 1;
      }
    } else continue;

    // Find denominator
    let k = numEnd;
    while (k < tex.length && tex[k] === ' ') k++;

    let denContent, denEnd;
    if (k < tex.length && tex[k] === '{') {
      // Braced denominator
      const den = matchBraceGroup(tex, k);
      if (!den) continue;
      denContent = den.content;
      denEnd = den.end;
    } else if (k < tex.length) {
      // Bare denominator
      if (tex[k] === '\\' && k + 1 < tex.length && /[a-zA-Z]/.test(tex[k + 1])) {
        const cmdMatch = tex.slice(k).match(/^\\[a-zA-Z]+/);
        denContent = cmdMatch[0];
        denEnd = k + cmdMatch[0].length;
      } else {
        denContent = tex[k];
        denEnd = k + 1;
      }
    } else continue;

    fracs.push({
      full: tex.slice(m.index, denEnd),
      numerator: numContent,
      denominator: denContent,
    });
  }
  return fracs;
}

/**
 * Extract distinctive sub-expressions that make a formula unique.
 * Focuses on unusual exponents, function arguments, constants,
 * and nested structures that differentiate from common formulas.
 * Returns array of distinctive expression strings.
 */
function extractDistinctiveSubexprs(tex) {
  const distinctive = [];

  // 1. Complex exponents: ^{...} with operators/commands inside
  for (let i = 0; i < tex.length; i++) {
    if (tex[i] === '^' && tex[i + 1] === '{') {
      const bg = matchBraceGroup(tex, i + 1);
      if (bg && bg.content.length > 1 && /[+\-*/\\]/.test(bg.content)) {
        // Convert exponent LaTeX to readable text
        const expText = bg.content
          .replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
          .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
          .replace(/\\([a-zA-Z]+)/g, '$1')
          .replace(/[{}]/g, '')
          .trim();
        if (expText.length > 1) distinctive.push(expText);
      }
    }
  }

  // 2. Function arguments with complexity: \fn(...) or \fn{...}
  const fnRe = /\\(ln|log|sin|cos|tan|exp|sec|csc|cot|arcsin|arccos|arctan|arcsec|arccsc|arccot|sinh|cosh|tanh)\s*[({]/g;
  let fm;
  while ((fm = fnRe.exec(tex)) !== null) {
    const fnName = fm[1];
    const openChar = tex[fm.index + fm[0].length - 1];
    if (openChar === '{') {
      const bg = matchBraceGroup(tex, fm.index + fm[0].length - 1);
      if (bg && bg.content.length > 3) {
        const argText = latexToReadable(bg.content);
        if (argText.length > 3) distinctive.push(fnName + '(' + argText + ')');
      }
    } else if (openChar === '(') {
      // Find matching close paren
      let depth = 1, j = fm.index + fm[0].length;
      while (j < tex.length && depth > 0) {
        if (tex[j] === '(') depth++;
        else if (tex[j] === ')') depth--;
        j++;
      }
      if (depth === 0) {
        const arg = tex.slice(fm.index + fm[0].length, j - 1);
        if (arg.length > 3) {
          const argText = latexToReadable(arg);
          if (argText.length > 3) distinctive.push(fnName + '(' + argText + ')');
        }
      }
    }
  }

  // 3. Unusual numeric constants (not just 0, 1, 2, x, n)
  const numRe = /(?:^|[+\-=,;\s{}()])([2-9]\d*|\d+\.\d+)(?=[+\-=,;\s{}()\\]|$)/g;
  let nm;
  while ((nm = numRe.exec(tex)) !== null) {
    const num = nm[1];
    if (!['0', '1', '2', '3'].includes(num) && num.length <= 6) {
      distinctive.push(num);
    }
  }

  // 4. Named constants / special expressions
  if (/\\sqrt\{?3\}?/.test(tex)) distinctive.push('sqrt(3)');
  if (/\\sqrt\{?2\}?/.test(tex)) distinctive.push('sqrt(2)');
  if (/\\sqrt\{?5\}?/.test(tex)) distinctive.push('sqrt(5)');
  if (/\\phi/.test(tex)) distinctive.push('golden ratio');
  if (/\\zeta/.test(tex)) distinctive.push('zeta');
  if (/\\Gamma/.test(tex)) distinctive.push('Gamma');
  if (/\\pi/.test(tex)) distinctive.push('pi');

  // 5. Fraction structure as readable text
  const fracs = extractFractionsDeep(tex);
  for (const frac of fracs) {
    const numText = latexToReadable(frac.numerator);
    const denText = latexToReadable(frac.denominator);
    if (numText.length > 2 && denText.length > 1) {
      distinctive.push(numText + ' over ' + denText);
    }
  }

  // Deduplicate
  return [...new Set(distinctive)];
}

/**
 * Extract distinctive LaTeX fragments for verbatim SE search.
 * These are snippets that likely appear in MSE question titles.
 * e.g. from \int_{...}\frac{x\arctan\frac{1}{x}\log(1+x^2)}{1+x^2}dx
 *   → ["\\arctan\\frac{1}{x}", "\\log(1+x^2)", "\\frac{x\\arctan"]
 */
function extractLatexFragments(tex) {
  const fragments = [];

  // 1. Function calls with their arguments (captures \arctan\frac{1}{x}, \log(1+x^2))
  const fnRe = /\\(arcsin|arccos|arctan|ln|log|sin|cos|tan|exp|sec|csc|cot|sinh|cosh|tanh)/g;
  let fm;
  while ((fm = fnRe.exec(tex)) !== null) {
    const fnStart = fm.index;
    let fnEnd = fm.index + fm[0].length;

    // Capture argument: could be \frac..., (...), or {....}
    let j = fnEnd;
    while (j < tex.length && tex[j] === ' ') j++;

    if (j < tex.length) {
      if (tex.startsWith('\\frac', j)) {
        // Function followed by \frac: e.g. \arctan\frac{1}{x}
        // Find end of the \frac (2 arguments)
        let fj = j + 5;
        while (fj < tex.length && tex[fj] === ' ') fj++;
        // Num
        if (fj < tex.length && tex[fj] === '{') {
          const bg = matchBraceGroup(tex, fj);
          if (bg) fj = bg.end; else fj++;
        } else if (fj < tex.length) fj++;
        while (fj < tex.length && tex[fj] === ' ') fj++;
        // Den
        if (fj < tex.length && tex[fj] === '{') {
          const bg = matchBraceGroup(tex, fj);
          if (bg) fj = bg.end; else fj++;
        } else if (fj < tex.length) fj++;
        fnEnd = fj;
      } else if (tex[j] === '(') {
        // Paren arg: \log(1+x^2)
        let depth = 1, pj = j + 1;
        while (pj < tex.length && depth > 0) {
          if (tex[pj] === '(') depth++;
          else if (tex[pj] === ')') depth--;
          pj++;
        }
        fnEnd = pj;
      } else if (tex[j] === '{') {
        const bg = matchBraceGroup(tex, j);
        if (bg) fnEnd = bg.end;
      }
    }

    const frag = tex.slice(fnStart, fnEnd).trim();
    if (frag.length > 5 && !fragments.includes(frag)) {
      fragments.push(frag);
    }
  }

  // 2. The main \frac{...}{...} as a fragment
  const fracs = extractFractionsDeep(tex);
  for (const frac of fracs) {
    if (frac.full.length > 8 && frac.full.length < 100 && !fragments.includes(frac.full)) {
      fragments.push(frac.full);
    }
  }

  // 3. Content between specific operators (e.g. between \int_..^ and dx)
  const integrandRe = /\\int[_^{}\d\\a-zA-Z\s-]*?\{?\s*(\\frac.+)/;
  const intMatch = tex.match(integrandRe);
  if (intMatch) {
    // Take up to the final dx/dt/ds
    let integrand = intMatch[1].replace(/\s*d[xyztsr]\s*$/, '').trim();
    if (integrand.length > 10 && integrand.length < 100 && !fragments.includes(integrand)) {
      fragments.push(integrand);
    }
  }

  return fragments;
}

/**
 * Lightweight LaTeX-to-readable converter (no "over" for fracs).
 * Handles deeply nested braces correctly.
 */
function latexToReadable(tex) {
  let s = tex;
  // Handle bare \frac without braces: \frac1x → (1)/(x), \frac ab → (a)/(b)
  s = s.replace(/\\frac\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
    (_, n, d) => '(' + latexToReadable(n) + ')/(' + latexToReadable(d) + ')');
  s = s.replace(/\\frac\s*(\\[a-zA-Z]+|[^\s{}\\])\s*(\\[a-zA-Z]+|[^\s{}\\])/g,
    (_, n, d) => '(' + latexToReadable(n) + ')/(' + latexToReadable(d) + ')');
  s = s.replace(/\\sqrt\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g, 'sqrt($1)');
  s = s.replace(/\\(arcsin|arccos|arctan|arcsec|arccsc|arccot)/g, '$1');
  s = s.replace(/\\(ln|log|sin|cos|tan|exp|sec|csc|cot|sinh|cosh|tanh)/g, '$1');
  s = s.replace(/\\(pi|alpha|beta|gamma|theta|lambda|phi|infty|epsilon|delta|sigma|omega|mu|nu|rho|tau|xi|psi|eta|zeta)/g, '$1');
  s = s.replace(/\\mathrm\{([^}]*)\}/g, '$1');
  s = s.replace(/\\operatorname\{([^}]*)\}/g, '$1');
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\[,;!]\s*/g, '');
  s = s.replace(/\\cdot/g, '*');
  s = s.replace(/\\[a-zA-Z]+/g, '');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}

/* ================================================================
   NOTATION VARIANT GENERATOR
   ================================================================
   Generates alternative LaTeX notations for the same formula.
   Handles common notation differences found across MSE posts:
     - \cos(x) ↔ \cos x         (parens vs bare argument)
     - dx ↔ \mathrm{d}x         (plain vs upright differential)
     - \left( \right) ↔ ( )     (auto-sizing vs plain delimiters)
     - \, \; \!                  (thin spaces stripped)
   ================================================================ */

function generateNotationVariants(tex) {
  const variants = new Set();
  const FN = 'sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|arcsin|arccos|arctan|ln|log|exp';
  const fnParenRe = new RegExp('\\\\(' + FN + ')\\s*\\(([^)]*)\\)', 'g');
  const bareFnRe  = new RegExp('\\\\(' + FN + ')\\s+([a-zA-Z])(?=[^a-zA-Z{(]|$)', 'g');

  // 1. Strip parens from function calls: \cos(x) → \cos x
  const v1 = tex.replace(fnParenRe, '\\$1 $2');
  if (v1 !== tex) variants.add(v1);

  // 2. Add parens to bare function args: \cos x → \cos(x)
  const v2 = tex.replace(bareFnRe, '\\$1($2)');
  if (v2 !== tex) variants.add(v2);

  // 3. Plain dx → \mathrm{d}x
  const v3 = tex.replace(/([\s}])d([xyztsr])(?=[\s\\}]|$)/g, '$1\\mathrm{d}$2');
  if (v3 !== tex) variants.add(v3);

  // 4. \mathrm{d}x → dx
  const v4 = tex.replace(/\\mathrm\{d\}/g, 'd');
  if (v4 !== tex) variants.add(v4);

  // 5. Strip \left / \right
  const v5 = tex.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');
  if (v5 !== tex) variants.add(v5);

  // 6. Strip thin spaces \, \; \!
  const v6 = tex.replace(/\\[,;!]\s*/g, '');
  if (v6 !== tex) variants.add(v6);

  // 7. Combined: strip parens + add \mathrm{d}
  if (v1 !== tex) {
    const v7 = v1.replace(/([\s}])d([xyztsr])(?=[\s\\}]|$)/g, '$1\\mathrm{d}$2');
    if (v7 !== tex && v7 !== v1) variants.add(v7);
  }

  // 8. Combined: strip parens + strip thin spaces
  if (v1 !== tex) {
    const v8 = v1.replace(/\\[,;!]\s*/g, '');
    if (v8 !== tex && v8 !== v1) variants.add(v8);
  }

  // 9. Space-collapsed form: remove all optional spaces
  //    e.g. \int_0^1 \ln(\sin(x)) dx → \int_0^1\ln(\sin(x))dx
  const collapsed = tex
    .replace(/(?<=\}|\)|\])\s+(?=\\[a-zA-Z]|[a-zA-Z(])/g, '')
    .replace(/(?<=\^[0-9}]|_[0-9}])\s+(?=[a-zA-Z\\(])/g, '')
    .replace(/\s+(?=d[xyztsr](?:[\s\\})\]$]|$))/g, '');
  if (collapsed !== tex) variants.add(collapsed);

  // 10. Canonical-spaced form: add spaces at every token boundary
  if (typeof LaTeXCanon !== 'undefined' && LaTeXCanon.normalizeSpacing) {
    const spaced = LaTeXCanon.normalizeSpacing(tex);
    if (spaced !== tex) variants.add(spaced);
  }

  // 11. Add \left( \right) around plain parens: (...) → \left(...\right)
  const v11 = tex.replace(/(?<!\\left)\(([^)]+)\)(?!\\right)/g, '\\left($1\\right)');
  if (v11 !== tex) variants.add(v11);

  // 12. Strip \left \right but keep delimiters: \left(...\right) → (...)
  //     (v5 already strips \left/\right, but this is more comprehensive)
  const v12 = tex.replace(/\\left\s*([(\[{|.])/g, '$1').replace(/\\right\s*([)\]}|.])/g, '$1');
  if (v12 !== tex && v12 !== v5) variants.add(v12);

  // 13. \log ↔ \ln equivalence (many authors use them interchangeably)
  const v13a = tex.replace(/\\ln(?![a-zA-Z])/g, '\\log');
  if (v13a !== tex) variants.add(v13a);
  const v13b = tex.replace(/\\log(?![a-zA-Z])/g, '\\ln');
  if (v13b !== tex) variants.add(v13b);

  // 14. \cdot ↔ \times ↔ (nothing) multiply notation
  if (/\\cdot/.test(tex)) {
    variants.add(tex.replace(/\\cdot/g, '\\times'));
    variants.add(tex.replace(/\s*\\cdot\s*/g, ' '));
  }
  if (/\\times/.test(tex)) {
    variants.add(tex.replace(/\\times/g, '\\cdot'));
  }

  // 15. dx ↔ \,dx (thin space before differential)
  const v15a = tex.replace(/\\,\s*d([xyztsr])(?=[\s\\})|$])/g, 'dx').replace(/dx/, 'd$1');
  const v15b = tex.replace(/([^,\\])d([xyztsr])(?=[\s\\})|$])/g, '$1\\,d$2');
  if (v15a !== tex) variants.add(v15a);
  if (v15b !== tex) variants.add(v15b);

  // 16. \int_{a}^{b} ↔ \int_a^b  (brace-stripped bounds)
  const v16 = tex.replace(/_(\\?\{[^}]*\}|\{[^}]\})/g, (m, g) => {
    const inner = g.startsWith('{') ? g.slice(1, -1) : g;
    return inner.length === 1 ? '_' + inner : m;
  }).replace(/\^(\\?\{[^}]*\}|\{[^}]\})/g, (m, g) => {
    const inner = g.startsWith('{') ? g.slice(1, -1) : g;
    return inner.length === 1 ? '^' + inner : m;
  });
  if (v16 !== tex) variants.add(v16);

  // 17. \arctan ↔ \tan^{-1} equivalence
  const invFnMap = [
    ['\\arctan', '\\tan^{-1}'], ['\\arcsin', '\\sin^{-1}'], ['\\arccos', '\\cos^{-1}']
  ];
  for (const [arc, inv] of invFnMap) {
    if (tex.includes(arc)) variants.add(tex.replace(new RegExp(arc.replace('\\', '\\\\'), 'g'), inv));
    if (tex.includes(inv)) variants.add(tex.replace(new RegExp(inv.replace(/[\\{}^-]/g, '\\$&'), 'g'), arc));
  }

  return [...variants];
}

/* Extract compact math keywords for broad text matching */
function buildCompactKeywords(tex) {
  const terms = [];
  const seen = new Set();

  // Function names
  const funcs = tex.match(/\\(sin|cos|tan|sec|csc|cot|ln|log|exp|sinh|cosh|tanh|arcsin|arccos|arctan)/g);
  if (funcs) {
    for (const f of funcs) {
      const name = f.slice(1);
      if (!seen.has(name)) { terms.push(name); seen.add(name); }
    }
  }

  // Significant expressions from brace groups
  const braces = extractBraceGroups(tex);
  for (const b of braces) {
    const clean = b.replace(/\\[a-zA-Z]+/g, '').replace(/[{}()]/g, '').trim();
    if (clean.length >= 3 && !/^[a-z]$/i.test(clean) && !seen.has(clean)) {
      terms.push(clean);
      seen.add(clean);
    }
  }

  // Operation keywords
  if (/\\int/.test(tex))  terms.push('integral');
  if (/\\infty/.test(tex)) terms.push('infinity');
  if (/\\sum/.test(tex))  terms.push('sum');
  if (/\\lim/.test(tex))  terms.push('limit');
  if (/\\prod/.test(tex)) terms.push('product');

  return terms.join(' ');
}

/* ================================================================
   ADVANCED INTEGRAL REWRITING ENGINE (for ≥10 min deep search)
   ================================================================
   Aggressive rewriting: substitution techniques, partial-fraction
   decomposition patterns, integration-by-parts patterns, trig
   substitution forms, Weierstrass, contour-integral equivalences,
   series expansion representations, and parametric integral forms.
   ================================================================ */

function advancedIntegralRewrites(tex) {
  const rewrites = new Set();
  const isIntegral = /\\int/.test(tex);

  // ── 1. Substitution-based rewrites ──
  // u-substitution: rewrite integrand with different variable names
  if (isIntegral) {
    // Replace integration variable x→t→u→s
    for (const v of ['t', 'u', 's', 'y']) {
      const swapped = tex.replace(/([^a-zA-Z])x(?=[^a-zA-Z]|$)/g, '$1' + v)
                         .replace(/\bdx\b/g, 'd' + v)
                         .replace(/\\,\s*dx/g, '\\,' + 'd' + v);
      if (swapped !== tex) rewrites.add(swapped);
    }

    // Extract integrand (between \int...dx) for separate search
    const integrandMatch = tex.match(/\\int[_^{}\d\\a-zA-Z\s]*?\s+(.+?)\s*(?:d[xyztsr])\s*$/);
    if (integrandMatch) {
      const integrand = integrandMatch[1].trim();
      if (integrand.length > 5) {
        rewrites.add(integrand);  // Search for integrand alone
        // Also search "integral of <integrand>"
        const readable = latexToReadable(integrand);
        if (readable.length > 3) {
          rewrites.add('integral of ' + readable);
          rewrites.add('integrate ' + readable);
          rewrites.add('how to integrate ' + readable);
          rewrites.add('evaluate integral ' + readable);
        }
      }
    }
  }

  // ── 2. Trig substitution forms ──
  if (isIntegral) {
    // √(a²-x²) → x=a sin θ pattern
    if (/\\sqrt\{?[^}]*-\s*x\^?\{?2/.test(tex) || /\\sqrt\{?a\^?\{?2\}?\s*-/.test(tex)) {
      rewrites.add(tex.replace(/x/g, '\\sin\\theta').replace(/dx/g, '\\cos\\theta\\,d\\theta'));
      rewrites.add('trigonometric substitution ' + latexToReadable(tex));
    }
    // √(a²+x²) → x=a tan θ pattern
    if (/\\sqrt\{?[^}]*\+\s*x\^?\{?2/.test(tex) || /a\^?\{?2\}?\s*\+\s*x\^?\{?2/.test(tex)) {
      rewrites.add('trigonometric substitution tangent ' + latexToReadable(tex));
    }
    // √(x²-a²) → x=a sec θ pattern
    if (/\\sqrt\{?x\^?\{?2[^}]*-/.test(tex)) {
      rewrites.add('trigonometric substitution secant ' + latexToReadable(tex));
    }
  }

  // ── 3. Integration by parts indicators ──
  if (isIntegral) {
    const hasLog = /\\ln|\\log/.test(tex);
    const hasTrig = /\\(sin|cos|tan|sec|csc|cot)/.test(tex);
    const hasExp = /\\exp|e\^/.test(tex);
    const hasPoly = /x\^?\{?\d/.test(tex);

    if ((hasLog && hasPoly) || (hasTrig && hasPoly) || (hasTrig && hasExp)) {
      rewrites.add('integration by parts ' + latexToReadable(tex));
      rewrites.add('tabular integration ' + latexToReadable(tex));
    }
    // x^n * e^x → integration by parts
    if (hasExp && hasPoly) {
      rewrites.add('integral polynomial exponential');
    }
    // x^n * ln(x) → integration by parts
    if (hasLog && hasPoly) {
      rewrites.add('integral polynomial logarithm');
    }
  }

  // ── 4. Partial fraction rewrites ──
  if (/\\frac/.test(tex)) {
    const fracs = extractFractionsDeep(tex);
    for (const frac of fracs) {
      // If denominator is a product, suggest partial fractions
      const den = frac.denominator;
      if (/[+\-]/.test(den) || /\(.*\)\s*\(/.test(den)) {
        rewrites.add('partial fractions ' + latexToReadable(frac.full));
        rewrites.add('partial fraction decomposition ' + latexToReadable(den));
      }
      // If denominator has (1+x^2), (1-x^2), etc → trig/Weierstrass
      if (/1\s*[+-]\s*x\^?\{?2/.test(den)) {
        rewrites.add('Weierstrass substitution ' + latexToReadable(tex));
      }
    }
  }

  // ── 5. Weierstrass half-angle substitution ──
  if (isIntegral && /\\(sin|cos|tan)/.test(tex)) {
    rewrites.add('Weierstrass substitution t=tan(x/2) ' + latexToReadable(tex));
    rewrites.add('half angle substitution ' + latexToReadable(tex));
  }

  // ── 6. Contour integration / residue forms ──
  if (isIntegral && /\\infty|_\{?0\}?\^\{?\\pi/.test(tex)) {
    rewrites.add('contour integration ' + latexToReadable(tex));
    rewrites.add('residue theorem ' + latexToReadable(tex));
  }

  // ── 7. Series expansion representations ──
  if (isIntegral) {
    rewrites.add('series expansion ' + latexToReadable(tex));
    rewrites.add('Taylor series integral ' + latexToReadable(tex));
    // Specific known integrals
    if (/\\ln.*\\sin|\\sin.*\\ln/.test(tex)) {
      rewrites.add('integral ln sin Fourier series');
    }
    if (/\\zeta|zeta/.test(tex)) {
      rewrites.add('Riemann zeta integral representation');
    }
  }

  // ── 8. Parametric / Feynman trick ──
  if (isIntegral && /\\frac/.test(tex)) {
    rewrites.add('differentiation under integral sign ' + latexToReadable(tex));
    rewrites.add('Feynman technique ' + latexToReadable(tex));
    rewrites.add('Leibniz integral rule ' + latexToReadable(tex));
  }

  // ── 9. Known closed-form identities ──
  if (isIntegral) {
    // Gaussian integral
    if (/e\^\{?-\s*x\^?\{?2/.test(tex) || /\\exp\s*\(\s*-\s*x\^?\{?2/.test(tex)) {
      rewrites.add('Gaussian integral');
      rewrites.add('\\int e^{-x^2} dx');
      rewrites.add('integral exp(-x^2)');
    }
    // Dirichlet integral
    if (/\\frac\{?\\sin/.test(tex) && /x/.test(tex)) {
      rewrites.add('Dirichlet integral sin(x)/x');
    }
    // Beta function
    if (/x\^.*\(1-x\)\^|x\^.*\\left\(1-x\\right\)\^/.test(tex)) {
      rewrites.add('Beta function integral');
      rewrites.add('B(a,b) integral');
    }
    // Gamma function
    if (/x\^.*e\^\{?-x/.test(tex)) {
      rewrites.add('Gamma function integral');
    }
    // Fresnel integrals
    if (/\\(sin|cos)\s*\(?x\^?\{?2/.test(tex)) {
      rewrites.add('Fresnel integral');
    }
  }

  // ── 10. Symbolic algebra rewrites ──
  // Factor/expand inner expressions
  if (/\\frac/.test(tex)) {
    const fracs = extractFractionsDeep(tex);
    for (const frac of fracs) {
      // Swap numerator/denominator as distinct search
      rewrites.add('\\frac{' + frac.denominator + '}{' + frac.numerator + '}');
    }
  }

  // ── 11. Natural language method queries ──
  if (isIntegral) {
    const readable = latexToReadable(tex);
    if (readable.length > 5) {
      rewrites.add('closed form ' + readable);
      rewrites.add('evaluate ' + readable);
      rewrites.add('compute ' + readable);
      rewrites.add('proof ' + readable);
      rewrites.add('solution ' + readable);
    }
  }

  // ── 12. Bounds manipulation ──
  if (isIntegral) {
    // 0 to ∞ ↔ 0 to 1 via substitution mention
    if (/0\}?\^\{?\\infty/.test(tex)) {
      const bounded = tex.replace(/0\}?\^\{?\\infty\}?/, '0}^{1}');
      rewrites.add(bounded);
      rewrites.add(tex.replace(/0\}?\^\{?\\infty\}?/, '-\\infty}^{\\infty}'));
    }
    // 0 to pi/2 ↔ 0 to pi
    if (/\\pi\s*\/?\s*2|\\frac\{?\\pi\}?\{?2\}?/.test(tex)) {
      rewrites.add(tex.replace(/\\frac\{?\\pi\}?\{?2\}?|\\pi\s*\/\s*2/g, '\\pi'));
    }
  }

  // ── 13. Sum vs integral duality ──
  if (/\\sum/.test(tex)) {
    // Sum → integral analog
    rewrites.add(tex.replace(/\\sum/g, '\\int'));
    rewrites.add('Euler-Maclaurin ' + latexToReadable(tex));
  }
  if (isIntegral) {
    // Integral → sum/series
    rewrites.add(tex.replace(/\\int/g, '\\sum'));
  }

  return [...rewrites].filter(r => r.length > 5 && r.length < 250);
}

/**
 * Generate deeply aggressive LaTeX rewrites — all possible notation forms.
 * Used for waves 8-10 in ≥10min mode.
 */
function deepAggressiveRewrites(tex) {
  const rewrites = new Set();

  // 1. Every function with both paren and brace forms
  const fnRe = /\\(sin|cos|tan|sec|csc|cot|ln|log|exp|arcsin|arccos|arctan|sinh|cosh|tanh)/g;
  let m;
  while ((m = fnRe.exec(tex)) !== null) {
    const fn = m[1];
    // \fn{arg} → \fn(arg) and vice versa
    const braceVer = tex.replace(new RegExp('\\\\' + fn + '\\s*\\(([^)]*)\\)', 'g'), '\\' + fn + '{$1}');
    const parenVer = tex.replace(new RegExp('\\\\' + fn + '\\s*\\{([^}]*)\\}', 'g'), '\\' + fn + '($1)');
    if (braceVer !== tex) rewrites.add(braceVer);
    if (parenVer !== tex) rewrites.add(parenVer);
  }

  // 2. Power notation variants: x^2 ↔ x^{2} ↔ x² (in title)
  rewrites.add(tex.replace(/\^(\d)/g, '^{$1}'));
  rewrites.add(tex.replace(/\^\{(\d)\}/g, '^$1'));

  // 3. Multiplication signs: juxtaposition ↔ \cdot ↔ \times
  if (!/\\cdot|\\times/.test(tex)) {
    // Add explicit \cdot between multiplicands
    const withCdot = tex.replace(/([a-zA-Z)}])\s+([a-zA-Z\\({])/g, '$1 \\cdot $2');
    if (withCdot !== tex) rewrites.add(withCdot);
  }

  // 4. \displaystyle prefix (many titles include it)
  if (!/\\displaystyle/.test(tex)) {
    rewrites.add('\\displaystyle ' + tex);
  }

  // 5. Strip \displaystyle if present
  rewrites.add(tex.replace(/\\displaystyle\s*/g, ''));

  // 6. e^{x} ↔ \exp(x) ↔ \mathrm{exp}(x)
  if (/e\^/.test(tex)) {
    rewrites.add(tex.replace(/e\^\{([^}]*)\}/g, '\\exp($1)'));
    rewrites.add(tex.replace(/e\^\{([^}]*)\}/g, '\\exp\\left($1\\right)'));
  }
  if (/\\exp/.test(tex)) {
    rewrites.add(tex.replace(/\\exp\s*\(([^)]*)\)/g, 'e^{$1}'));
    rewrites.add(tex.replace(/\\exp\s*\{([^}]*)\}/g, 'e^{$1}'));
  }

  // 7. Absolute values: |x| ↔ \lvert x \rvert ↔ \left| x \right|
  if (/\|/.test(tex)) {
    rewrites.add(tex.replace(/\|([^|]*)\|/g, '\\lvert $1 \\rvert'));
    rewrites.add(tex.replace(/\|([^|]*)\|/g, '\\left| $1 \\right|'));
  }
  if (/\\lvert/.test(tex)) {
    rewrites.add(tex.replace(/\\lvert\s*/g, '|').replace(/\\rvert\s*/g, '|'));
  }

  // 8. Summation index variants: i ↔ k ↔ n ↔ j
  if (/\\sum/.test(tex)) {
    for (const [from, to] of [['i', 'k'], ['k', 'n'], ['n', 'j'], ['i', 'n']]) {
      const swapped = tex.replace(new RegExp('(?<=[=_^{])' + from + '(?=[}=^_\\s])', 'g'), to);
      if (swapped !== tex) rewrites.add(swapped);
    }
  }

  // 9. Fraction simplifications for single-char numerator/denominator
  rewrites.add(tex.replace(/\\frac\{(\w)\}\{(\w)\}/g, '\\frac $1 $2'));
  rewrites.add(tex.replace(/\\frac\s+(\w)\s+(\w)/g, '\\frac{$1}{$2}'));

  // 10. \dfrac ↔ \frac ↔ \tfrac
  if (/\\frac/.test(tex)) {
    rewrites.add(tex.replace(/\\frac/g, '\\dfrac'));
    rewrites.add(tex.replace(/\\frac/g, '\\tfrac'));
  }
  if (/\\dfrac/.test(tex)) {
    rewrites.add(tex.replace(/\\dfrac/g, '\\frac'));
  }
  if (/\\tfrac/.test(tex)) {
    rewrites.add(tex.replace(/\\tfrac/g, '\\frac'));
  }

  return [...rewrites].filter(r => r !== tex && r.length > 5 && r.length < 300);
}

/* ================================================================
   BUILD SEARCH QUERIES
   ================================================================ */

function buildSearchQueries(tex, keywords) {
  const queries = [];
  let m;

  // 1. Exact \frac blocks (using deep brace parser)
  const deepFracs = extractFractionsDeep(tex);
  if (deepFracs.length) {
    queries.push({ type: 'exact', q: deepFracs[0].full });
  }
  // Keep regex fallback for simpler cases
  const fracRe = /\\frac\s*(\{(?:[^{}]|\{[^{}]*\})*\}\s*\{(?:[^{}]|\{[^{}]*\})*\})/g;
  const fracs = [];
  while ((m = fracRe.exec(tex)) !== null) fracs.push('\\frac' + m[1]);
  if (fracs.length && !queries.find(q => q.q === fracs[0])) {
    queries.push({ type: 'exact', q: fracs[0] });
  }

  // 2. Distinctive brace contents as parts
  const braceContents = extractBraceGroups(tex);
  const distinctive = braceContents
    .filter(c => c.length >= 3 && !/^\d+$/.test(c) && !/^\\infty$/.test(c))
    .sort((a, b) => b.length - a.length);
  if (distinctive.length >= 2) {
    queries.push({ type: 'parts', q: distinctive[0] + ' ' + distinctive[1] });
  } else if (distinctive.length === 1) {
    queries.push({ type: 'parts', q: distinctive[0] });
  }

  // 3. Function calls (including bare-arg forms like \arctan\frac1x)
  const funcRe = /\\(ln|log|sin|cos|tan|sec|csc|cot|exp|arcsin|arccos|arctan|arcsec|arccsc|arccot|sinh|cosh|tanh)\s*(?:[\({][^)\}]*[\)}]|\\frac\s*(?:\{[^}]*\}|[^\s{}])\s*(?:\{[^}]*\}|[^\s{}]))/g;
  const funcs = [];
  while ((m = funcRe.exec(tex)) !== null) funcs.push(m[0]);

  // 4. Bounds
  const boundsRe = /\\(int|sum|prod)_\{?([^{}^]*)\}?\^\{?([^{} ]*)\}?/;
  const boundsMatch = tex.match(boundsRe);
  let boundsStr = '';
  if (boundsMatch) {
    boundsStr = boundsMatch[1] + ' ' + boundsMatch[2].replace(/\\/g, '') + ' ' + boundsMatch[3].replace(/\\/g, '');
  }

  // 5. Natural language
  const naturalQ = latexToNatural(tex);
  if (naturalQ.length > 5) queries.push({ type: 'natural', q: naturalQ });

  // 6. Mixed
  const mixedParts = [];
  if (funcs.length) mixedParts.push(...funcs.map(f => f.replace(/\\/g, '\\')));
  if (boundsStr) mixedParts.push(boundsStr);
  if (distinctive.length) mixedParts.push(distinctive[0]);
  if (mixedParts.length) queries.push({ type: 'mixed', q: mixedParts.join(' ') });

  // 7. Tag search
  const tags = extractTags(tex);
  if (tags) {
    const tagQ = (funcs[0] || distinctive[0] || naturalQ.split(' ').slice(0, 3).join(' '))
                 + (keywords ? ' ' + keywords : '');
    queries.push({ type: 'tagged', q: tagQ, tags });
  }

  // 8. Decomposed subformula queries (Level 1)
  const decomposed = decomposeFormula(tex);
  decomposed.filter(d => d.level === 1).forEach(d => {
    const subNatural = latexToNatural(d.tex);
    if (subNatural.length > 5 && !queries.find(q => q.q === subNatural)) {
      queries.push({ type: 'decomp', q: subNatural });
    }
  });

  // 9. Raw LaTeX query (many posts contain near-identical LaTeX source)
  if (tex.length >= 10) {
    queries.push({ type: 'raw', q: tex });
  }

  // 10. Notation variant queries
  //     Handles differences like \cos(x) vs \cos x, dx vs \mathrm{d}x
  const variants = generateNotationVariants(tex);
  const variantFracs = [];
  for (const variant of variants) {
    const vFracRe = /\\frac\s*(\{(?:[^{}]|\{[^{}]*\})*\}\s*\{(?:[^{}]|\{[^{}]*\})*\})/g;
    let vm;
    while ((vm = vFracRe.exec(variant)) !== null) {
      const vq = '\\frac' + vm[1];
      if (!queries.find(q => q.q.trim() === vq.trim()) &&
          !variantFracs.find(q => q.q.trim() === vq.trim())) {
        variantFracs.push({ type: 'variant', q: vq });
      }
    }
    // Also try the variant's natural-language form
    const vNatural = latexToNatural(variant);
    if (vNatural.length > 5 && !queries.find(q => q.q === vNatural) &&
        !variantFracs.find(q => q.q === vNatural)) {
      variantFracs.push({ type: 'variant-natural', q: vNatural });
    }
  }
  // Limit variant queries to avoid excessive API calls
  queries.push(...variantFracs.slice(0, 4));

  // 11. Compact math keywords for broad matching
  const compactQ = buildCompactKeywords(tex);
  if (compactQ.length > 5 && !queries.find(q => q.q === compactQ)) {
    queries.push({ type: 'compact', q: compactQ });
  }

  // 12. Exact-match query with denominator/bounds focus (using deep parser)
  if (tex) {
    const exactParts = [];
    // Include integral bounds
    const bm = tex.match(/\\int_\{?([^{}^]+)\}?\^\{?([^{}\s]+)\}?/);
    if (bm) {
      const lo = bm[1].replace(/\\/g, '').replace(/[{}]/g, '');
      const hi = bm[2].replace(/\\/g, '').replace(/[{}]/g, '');
      exactParts.push('integral ' + lo + ' ' + hi);
    }
    // Include denominator content (using deep parser)
    if (deepFracs.length) {
      const denom = latexToReadable(deepFracs[0].denominator);
      if (denom.length > 2) exactParts.push(denom);
    }
    // Include function names
    const fns = tex.match(/\\(sin|cos|tan|ln|log|exp|arcsin|arccos|arctan)/g);
    if (fns) exactParts.push(...[...new Set(fns.map(f => f.slice(1)))]);

    const exactQ = exactParts.join(' ').trim();
    if (exactQ.length > 8 && !queries.find(q => q.q === exactQ)) {
      queries.push({ type: 'exact-parts', q: exactQ });
    }
  }

  // 13. Distinctive sub-expression queries
  //     Extracts unique parts of the formula (unusual exponents, function
  //     arguments, constants) that narrow down to the exact question.
  //     e.g. for \int_0^1 \frac{\ln(1+x^{2+\sqrt{3}})}{1+x}dx
  //     this finds "2+sqrt(3)" and "ln(1+x^(2+sqrt(3)))"
  const distExprs = extractDistinctiveSubexprs(tex);
  if (distExprs.length) {
    // Build a focused query from most distinctive terms
    const distQ = distExprs.slice(0, 4).join(' ');
    if (distQ.length > 3 && !queries.find(q => q.q === distQ)) {
      queries.push({ type: 'distinctive', q: distQ });
    }
    // Also try each distinctive expression individually
    for (const expr of distExprs.slice(0, 3)) {
      const dq = 'integral ' + expr;
      if (dq.length > 5 && !queries.find(q => q.q === dq)) {
        queries.push({ type: 'distinctive-single', q: dq });
      }
    }
  }

  // 14. Deep fraction numerator/denominator as separate readable queries
  if (deepFracs.length) {
    const numText = latexToReadable(deepFracs[0].numerator);
    const denText = latexToReadable(deepFracs[0].denominator);
    const fracNatural = numText + ' ' + denText;
    if (fracNatural.length > 8 && !queries.find(q => q.q === fracNatural)) {
      queries.push({ type: 'frac-readable', q: fracNatural });
    }
  }

  // 15. Title-style query: mimic how users title their MSE questions
  //     e.g. "Integral $\int_0^1 \frac{\ln(...)}{1+x}dx$"
  if (tex) {
    const titleParts = [];
    if (/\\int/.test(tex)) titleParts.push('integral');
    if (/\\sum/.test(tex)) titleParts.push('sum');
    if (/\\prod/.test(tex)) titleParts.push('product');
    if (/\\lim/.test(tex)) titleParts.push('limit');
    // Add the raw LaTeX (many titles include the formula in $ delimiters)
    const shortTex = tex.length > 80 ? tex.slice(0, 80) : tex;
    const titleQ = titleParts.join(' ') + ' ' + shortTex;
    if (titleQ.length > 10 && !queries.find(q => q.q === titleQ)) {
      queries.push({ type: 'title-style', q: titleQ.trim() });
    }
  }

  // 16. SE intitle: search with key terms
  //     Many MSE question titles contain distinctive formula keywords
  if (distExprs.length) {
    const importantTerms = distExprs.filter(e => e.length > 2).slice(0, 2).join(' ');
    const opWords = [];
    if (/\\int/.test(tex)) opWords.push('integral');
    if (/\\ln|\\log/.test(tex)) opWords.push('ln');
    if (/\\arctan/.test(tex)) opWords.push('arctan');
    if (/\\arcsin/.test(tex)) opWords.push('arcsin');
    if (/\\arccos/.test(tex)) opWords.push('arccos');
    if (/\\sum/.test(tex)) opWords.push('sum');
    const intitleQ = [...opWords, importantTerms].join(' ').trim();
    if (intitleQ.length > 5 && !queries.find(q => q.q === intitleQ)) {
      queries.push({ type: 'intitle', q: intitleQ });
    }
  }

  // 17. LaTeX fragment verbatim search
  //     Many MSE titles contain literal LaTeX — search for distinctive
  //     fragments exactly as they'd appear in a title's $...$ block.
  //     e.g. "\\arctan\\frac1x" or "\\log(1+x^2)"
  if (tex) {
    const fragments = extractLatexFragments(tex);
    for (const frag of fragments.slice(0, 3)) {
      if (frag.length > 6 && !queries.find(q => q.q === frag)) {
        queries.push({ type: 'latex-frag', q: frag });
      }
    }
  }

  // 18. Function-focused search
  //     For formulas with multiple functions, build a query with just
  //     the function names + their arguments (no integral/bounds clutter)
  if (tex) {
    const funcParts = [];
    const allFnRe = /\\(arcsin|arccos|arctan|ln|log|sin|cos|tan|exp|sec|csc|cot|sinh|cosh|tanh)\b/g;
    let fnm;
    while ((fnm = allFnRe.exec(tex)) !== null) {
      funcParts.push(fnm[1]);
    }
    // Also capture key arguments like (1+x^2), 1/x
    const argParts = [];
    const parenArgRe = /\(([^)]{2,20})\)/g;
    let pam;
    while ((pam = parenArgRe.exec(tex)) !== null) {
      argParts.push(pam[1].replace(/\\/g, '').replace(/[{}]/g, ''));
    }
    if (funcParts.length >= 2) {
      const funcQ = funcParts.join(' ') + (argParts.length ? ' ' + argParts.join(' ') : '');
      if (!queries.find(q => q.q === funcQ)) {
        queries.push({ type: 'func-focus', q: funcQ });
      }
    }
  }

  // 19. Evaluate/compute phrasing search
  //     Many MSE titles start with "How to evaluate", "Evaluate", "Compute"
  if (tex) {
    const evalPhrases = ['evaluate', 'compute', 'calculate', 'find the value of'];
    const shortNatural = latexToNatural(tex);
    const mainWords = shortNatural.split(/\s+/).filter(w => w.length > 2).slice(0, 6).join(' ');
    if (mainWords.length > 5) {
      const evalQ = evalPhrases[0] + ' ' + mainWords;
      if (!queries.find(q => q.q === evalQ)) {
        queries.push({ type: 'evaluate', q: evalQ });
      }
    }
  }

  // Append user keywords
  if (keywords) {
    queries.forEach(entry => {
      if (entry.type !== 'tagged') entry.q += ' ' + keywords;
    });
  }

  return queries;
}

function latexToNatural(tex) {
  let s = tex;

  // ── Phase 1: Handle structures that need deep brace parsing ──
  // Replace \frac{...}{...} with proper handling of nested braces
  const fracs = extractFractionsDeep(s);
  // Sort by position descending so replacements don't shift indices
  const fracPositions = [];
  for (const frac of fracs) {
    const idx = s.indexOf(frac.full);
    if (idx >= 0) fracPositions.push({ idx, len: frac.full.length, frac });
  }
  fracPositions.sort((a, b) => b.idx - a.idx);
  for (const fp of fracPositions) {
    const numNatural = latexToReadable(fp.frac.numerator);
    const denNatural = latexToReadable(fp.frac.denominator);
    s = s.slice(0, fp.idx) + numNatural + ' over ' + denNatural + s.slice(fp.idx + fp.len);
  }

  // Replace \sqrt{...} with deep brace handling
  const sqrtRe = /\\sqrt\s*/g;
  let sqm;
  const sqrtPositions = [];
  while ((sqm = sqrtRe.exec(s)) !== null) {
    const bg = matchBraceGroup(s, sqm.index + sqm[0].length);
    if (bg) {
      sqrtPositions.push({ idx: sqm.index, end: bg.end, content: bg.content });
    }
  }
  sqrtPositions.sort((a, b) => b.idx - a.idx);
  for (const sp of sqrtPositions) {
    const inner = latexToReadable(sp.content);
    s = s.slice(0, sp.idx) + 'sqrt(' + inner + ')' + s.slice(sp.end);
  }

  // ── Phase 2: Remaining simple regex replacements ──
  const reps = [
    [/\\int_\{?0\}?\^\{?\\infty\}?/g, 'integral 0 infinity'],
    [/\\int_\{?0\}?\^\{?1\}?/g, 'integral 0 to 1'],
    [/\\int_\{?([^{}]+)\}?\^\{?([^{}]+)\}?/g, 'integral $1 to $2'],
    [/\\int/g, 'integral'],
    [/\\sum_\{?([^{}]*)\}?\^\{?([^{}]*)\}?/g, 'sum $1 to $2'],
    [/\\sum/g, 'sum'],
    [/\\prod/g, 'product'],
    [/\\lim_?\{?([^{}]*)\}?/g, 'limit $1'],
    [/\\lim/g, 'limit'],
    [/\\arcsin/g, 'arcsin'], [/\\arccos/g, 'arccos'], [/\\arctan/g, 'arctan'],
    [/\\ln/g, 'ln'], [/\\log/g, 'log'],
    [/\\sin/g, 'sin'], [/\\cos/g, 'cos'], [/\\tan/g, 'tan'],
    [/\\sec/g, 'sec'], [/\\csc/g, 'csc'], [/\\cot/g, 'cot'],
    [/\\sinh/g, 'sinh'], [/\\cosh/g, 'cosh'], [/\\tanh/g, 'tanh'],
    [/\\exp/g, 'exp'], [/\\cdot/g, '*'],
    [/\\infty/g, 'infinity'],
    [/\\pi/g, 'pi'], [/\\alpha/g, 'alpha'], [/\\beta/g, 'beta'],
    [/\\gamma/g, 'gamma'], [/\\theta/g, 'theta'], [/\\lambda/g, 'lambda'],
    [/\\partial/g, 'partial'], [/\\nabla/g, 'nabla'],
    [/\\binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1 choose $2'],
    [/\\mathrm\{([^}]*)\}/g, '$1'],
    [/\\operatorname\{([^}]*)\}/g, '$1'],
    [/\\left|\\right/g, ''],
    [/\\[,;!]\s*/g, ''],
    [/\\[a-zA-Z]+/g, ''],
    [/[{}^_\\]/g, ' '],
    [/\s+/g, ' '],
  ];
  for (const [re, rep] of reps) s = s.replace(re, rep);
  return s.trim();
}

function extractTags(tex) {
  const tagMap = [
    [/\\int/,                  'integration'],
    [/\\sum/,                  'sequences-and-series'],
    [/\\prod/,                 'products'],
    [/\\lim/,                  'limits'],
    [/\\frac/,                 'fractions'],
    [/\\sqrt/,                 'radicals'],
    [/\\binom/,                'combinatorics'],
    [/\\(p?matrix|det)/,       'matrices'],
    [/\\partial/,              'partial-derivative'],
    [/\\nabla/,                'multivariable-calculus'],
    [/\\ln|\\log/,             'logarithms'],
    [/\\(sin|cos|tan|sec|csc)/, 'trigonometry'],
    [/\\(arcsin|arccos|arctan)/, 'trigonometry'],
    [/\\(Gamma|zeta|eta)/i,    'special-functions'],
    [/\\infty.*\\int|\\int.*\\infty/, 'improper-integrals'],
    [/\\int_\{?\d/,            'definite-integrals'],
    [/definite/i,              'definite-integrals'],
  ];
  const found = [];
  for (const [re, tag] of tagMap) {
    if (re.test(tex) && !found.includes(tag)) found.push(tag);
  }
  return found.slice(0, 5).join(';');
}

/* ── Merge two semicolon-separated tag strings, dedup ── */
function mergeTags(a, b) {
  const set = new Set();
  if (a) a.split(';').filter(Boolean).forEach(t => set.add(t.trim()));
  if (b) b.split(';').filter(Boolean).forEach(t => set.add(t.trim()));
  return [...set].slice(0, 5).join(';');
}

/* ================================================================
   GOOGLE SITE-SEARCH FOR LATEX
   ================================================================
   Uses CORS proxy to scrape Google results for math.stackexchange.com.
   Extracts question IDs from URLs, then fetches full question data
   from the SE API. This catches results that AZ and SE search miss.
   ================================================================ */

async function fetchGoogleForLatex(query, maxResults) {
  maxResults = maxResults || 8;
  // If SearchEnhance has the Google fetcher, use it directly
  if (typeof SearchEnhance !== 'undefined' && SearchEnhance.fetchGoogleResults) {
    try {
      return await SearchEnhance.fetchGoogleResults(query, maxResults);
    } catch (_) { /* fall through */ }
  }

  // Fallback: implement Google scraping inline
  const encoded = encodeURIComponent('site:math.stackexchange.com ' + query);
  const googleUrl = 'https://www.google.com/search?q=' + encoded + '&num=10';
  const proxies = (Config && Config.CORS_PROXIES) || [];
  for (const proxy of proxies) {
    try {
      const resp = await fetchWithTimeout(proxy + encodeURIComponent(googleUrl), 8000);
      if (!resp.ok) continue;
      const html = await resp.text();
      const idRe = /math\.stackexchange\.com\/questions\/(\d+)/g;
      const ids = new Set();
      let match;
      while ((match = idRe.exec(html)) !== null && ids.size < maxResults) {
        ids.add(parseInt(match[1], 10));
      }
      if (ids.size > 0) {
        const idStr = [...ids].join(';');
        const seResp = await SearchCache.cachedFetch(
          `${Config.SE_API}/questions/${idStr}?site=${Config.SITE}&filter=${Config.SE_FILTER}&pagesize=${maxResults}`,
          Config.SEARCH_TIMEOUT_MS
        );
        if (seResp && seResp.ok) {
          const data = await seResp.json();
          return (data.items || []).map(item => ({ ...item, _source: 'google' }));
        }
      }
    } catch (_) { continue; }
  }
  return [];
}

/* ================================================================
   BARE FRACTION NORMALIZER
   ================================================================
   Converts bare \frac arguments to braced form:
     \frac1x       → \frac{1}{x}
     \frac ab      → \frac{a}{b}
     \frac\pi2     → \frac{\pi}{2}
     \frac1{1+x^2} → \frac{1}{1+x^2}  (mixed bare+braced)
   This is needed because many users write shorthand fractions
   without braces, but our parsers expect braced form.
   ================================================================ */
function normalizeBareFrags(tex) {
  // Apply normalization repeatedly to handle nested bare fracs
  let prev = tex;
  for (let pass = 0; pass < 3; pass++) {
    let result = '';
    let i = 0;
    while (i < prev.length) {
      // Look for \frac
      if (prev.startsWith('\\frac', i) && (i + 5 >= prev.length || !/[a-zA-Z]/.test(prev[i + 5]))) {
        result += '\\frac';
        let j = i + 5;
        while (j < prev.length && prev[j] === ' ') j++;

        // Parse numerator
        if (j < prev.length && prev[j] === '{') {
          const bg = matchBraceGroup(prev, j);
          if (bg) { result += bg.full; j = bg.end; }
          else { result += prev[j]; j++; }
        } else if (j < prev.length) {
          if (prev[j] === '\\' && j + 1 < prev.length && /[a-zA-Z]/.test(prev[j + 1])) {
            const cm = prev.slice(j).match(/^\\[a-zA-Z]+/);
            result += '{' + cm[0] + '}';
            j += cm[0].length;
          } else {
            result += '{' + prev[j] + '}';
            j++;
          }
        }

        while (j < prev.length && prev[j] === ' ') j++;

        // Parse denominator
        if (j < prev.length && prev[j] === '{') {
          const bg = matchBraceGroup(prev, j);
          if (bg) { result += bg.full; j = bg.end; }
          else { result += prev[j]; j++; }
        } else if (j < prev.length) {
          if (prev[j] === '\\' && j + 1 < prev.length && /[a-zA-Z]/.test(prev[j + 1])) {
            const cm = prev.slice(j).match(/^\\[a-zA-Z]+/);
            result += '{' + cm[0] + '}';
            j += cm[0].length;
          } else {
            result += '{' + prev[j] + '}';
            j++;
          }
        }
        i = j;
      } else {
        result += prev[i];
        i++;
      }
    }
    if (result === prev) break;  // No changes — done
    prev = result;
  }
  return prev;
}

/* ================================================================
   MAIN SEARCH ORCHESTRATOR
   ================================================================ */

async function searchLatex(forceOriginal) {
  let rawTex   = DOM.latexInput.value.trim();
  let keywords = DOM.latexKeywords.value.trim();

  // ── Normalize LaTeX spacing so "\int_0^1 ln(sin(x)) dx" === "\int_0^1ln(sin(x))dx"
  if (rawTex && typeof LaTeXCanon !== 'undefined') {
    rawTex = LaTeXCanon.normalizeSpacing(rawTex);
  }

  // ── Normalize bare \frac without braces: \frac1x → \frac{1}{x} ──
  if (rawTex) {
    rawTex = normalizeBareFrags(rawTex);
  }

  if (!rawTex && !keywords) {
    showStatus('Please enter a LaTeX formula or keywords.');
    clearResults();
    return;
  }

  // ── Autocorrect typos in LaTeX and keywords ──
  let acBanner = null;
  if (!forceOriginal && typeof SearchAutocorrect !== 'undefined') {
    const allCorrections = [];
    const originalRawTex = rawTex;
    const originalKeywords = keywords;

    // Fix LaTeX commands
    if (rawTex) {
      const acTex = SearchAutocorrect.correctLatex(rawTex);
      if (acTex.corrections.length) {
        rawTex = acTex.text;
        allCorrections.push(...acTex.corrections);
      }
    }
    // Fix keywords
    if (keywords) {
      const acKw = SearchAutocorrect.autocorrect(keywords, 'text');
      if (acKw.changed) {
        keywords = acKw.text;
        allCorrections.push(...acKw.corrections);
      }
    }
    if (allCorrections.length) {
      const origStr = originalRawTex + (originalKeywords ? ' ' + originalKeywords : '');
      acBanner = SearchAutocorrect.createSuggestionBanner(origStr, allCorrections, (orig) => {
        DOM.latexInput.value = originalRawTex;
        DOM.latexKeywords.value = originalKeywords;
        State.currentPage = 1;
        searchLatex(true);
      });
    }

    // ── Equivalence expansion for keywords ──
    if (keywords && SearchAutocorrect.expandEquivalences) {
      const eqResult = SearchAutocorrect.expandEquivalences(keywords);
      if (eqResult.additions.length > 0) {
        keywords = eqResult.expanded;
      }
    }
  }

  showLoader();
  const thisId = ++_latexSearchId;
  const startTime = performance.now();

  // Show "Did you mean?" banner
  if (acBanner) {
    DOM.results.innerHTML = '';
    DOM.results.appendChild(acBanner);
  }

  // ── ARQMath-style LaTeX canonicalization ──
  const tex = rawTex && typeof LaTeXCanon !== 'undefined'
    ? LaTeXCanon.normalizeForSearch(rawTex)
    : rawTex;

  // Track in history
  SearchCache.addHistory('latex', rawTex || keywords);

  // ════════════════════════════════════════════════
  // PHASE 1: Fire all search engines in WAVES
  //   Wave 1 (0s)   — top-priority SE queries + AZ primary
  //   Wave 2 (5s)   — remaining SE queries + AZ variants + Google
  //   Wave 3 (15s)  — notation variant SE queries + MO + wider Google
  //   Wave 4 (40s)  — rewrite combos + tag permutations
  //   Wave 5 (90s)  — exhaustive: all remaining variants + page 2
  //   ── Extended mode (≥10 min) adds 5 more waves: ──
  //   Wave 6        — Advanced integral rewriting (substitution, by-parts, etc.)
  //   Wave 7        — Method-specific deep search (cross-site)
  //   Wave 8        — Aggressive notation variants (dfrac, tfrac, e^x↔exp, etc.)
  //   Wave 9        — Deep page scanning (SE pages 3-5, AZ pages 4-6)
  //   Wave 10       — Final exhaustive sweep (broad terms, all remaining rewrites)
  //   Total timeout: user-configurable (1–30 min)
  // After each wave, results are merged, ranked, and displayed.
  // ════════════════════════════════════════════════
  const stats = { sources: {}, timing: {}, totalResults: 0, cached: 0, waves: 0 };
  let allItems = [];
  let quota = null;
  let anyHasMore = false;
  let rateLimited = false;

  const queryPlan = tex
    ? buildSearchQueries(tex, keywords)
    : [{ type: 'natural', q: keywords }];

  // Also build queries from original (non-canonicalized) form
  if (rawTex && tex !== rawTex) {
    const origQueries = buildSearchQueries(rawTex, keywords);
    for (const oq of origQueries) {
      if (!queryPlan.find(q => q.q === oq.q)) {
        queryPlan.push({ ...oq, type: 'orig-' + oq.type });
      }
    }
  }

  // ARQMath: Tokenizer-enhanced queries
  if (tex && typeof FormulaTokenizer !== 'undefined') {
    try {
      const tree = MathSimilarity.parse(
        typeof LaTeXCanon !== 'undefined' ? LaTeXCanon.canonicalize(tex) : tex
      );
      if (tree && tree.t !== 'empty') {
        const impQ = FormulaTokenizer.buildImportantTokensQuery(tree);
        if (impQ.length > 5 && !queryPlan.find(q => q.q === impQ)) {
          queryPlan.push({ type: 'tfidf', q: impQ });
        }
        const subQueries = FormulaTokenizer.extractSubexprQueries(tree, 3);
        for (const sq of subQueries.slice(0, 3)) {
          if (!queryPlan.find(q => q.q === sq.query)) {
            queryPlan.push({ type: 'subexpr', q: sq.query });
          }
        }
      }
    } catch (_) {}
  }

  // Build notation variant queries
  const allVariants = tex ? generateNotationVariants(tex) : [];
  // Also generate queries from each notation variant
  const variantQueries = [];
  for (const variant of allVariants.slice(0, 6)) {
    const vNatural = latexToNatural(variant);
    if (vNatural.length > 8 && !queryPlan.find(q => q.q === vNatural) && !variantQueries.find(q => q.q === vNatural)) {
      variantQueries.push({ type: 'variant-rewrite', q: vNatural });
    }
    const vReadable = latexToReadable(variant);
    if (vReadable.length > 5 && vReadable !== vNatural && !queryPlan.find(q => q.q === vReadable) && !variantQueries.find(q => q.q === vReadable)) {
      variantQueries.push({ type: 'variant-readable', q: vReadable });
    }
  }

  // Priority ordering
  const priorityOrder = ['distinctive', 'distinctive-single', 'latex-frag', 'exact', 'frac-readable',
    'func-focus', 'evaluate', 'intitle', 'tagged', 'natural', 'tfidf', 'title-style', 'exact-parts',
    'mixed', 'raw', 'variant', 'compact', 'parts', 'decomp', 'subexpr',
    'variant-natural', 'variant-rewrite', 'variant-readable', 'orig-exact', 'orig-natural'];
  const sortedPlan = [...queryPlan].sort((a, b) => {
    const ai = priorityOrder.indexOf(a.type);
    const bi = priorityOrder.indexOf(b.type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // ── User-selected tags from tag selector ──
  const userTags = typeof TagSelector !== 'undefined' ? TagSelector.getSelected('latex') : '';
  const defaultTags = !userTags ? extractTags(tex || keywords || '') : '';
  const activeTags = userTags || defaultTags;

  // Helper: build SE fetch promise
  function buildSEPromise(entry) {
    let url;
    if (entry.type === 'tagged') {
      const params = new URLSearchParams({
        order: 'desc', sort: 'relevance', site: Config.SITE,
        page: entry.sePage || State.currentPage, pagesize: '15',
        filter: Config.SE_FILTER, q: entry.q,
      });
      // Merge user-selected tags with auto-detected tags
      const combinedTags = mergeTags(entry.tags || '', activeTags);
      if (combinedTags) params.set('tagged', combinedTags);
      url = `${Config.SE_API}/search/advanced?${params}`;
    } else if (entry.type === 'intitle') {
      const params = new URLSearchParams({
        order: 'desc', sort: 'relevance', site: Config.SITE,
        page: entry.sePage || State.currentPage, pagesize: '15',
        filter: Config.SE_FILTER, q: entry.q,
      });
      const autoTags = extractTags(tex);
      const combinedTags = mergeTags(autoTags, activeTags);
      if (combinedTags) params.set('tagged', combinedTags);
      url = `${Config.SE_API}/search/advanced?${params}`;
    } else {
      // For excerpts, if user selected tags use /search/advanced instead
      if (userTags) {
        const params = new URLSearchParams({
          order: 'desc', sort: 'relevance', site: Config.SITE,
          page: entry.sePage || State.currentPage, pagesize: '15',
          filter: Config.SE_FILTER, q: entry.q,
        });
        if (activeTags) params.set('tagged', activeTags);
        url = `${Config.SE_API}/search/advanced?${params}`;
      } else {
        const params = new URLSearchParams({
          order: 'desc', sort: 'relevance', site: Config.SITE,
          page: entry.sePage || State.currentPage, pagesize: '15', q: entry.q,
        });
        url = `${Config.SE_API}/search/excerpts?${params}`;
      }
    }
    return SearchCache.cachedFetch(url, Config.SEARCH_TIMEOUT_MS)
      .then(r => {
        if (r.status === 429) return { engine: 'se-' + entry.type, data: null, rateLimited: true };
        return r.ok
          ? r.json().then(d => ({ engine: 'se-' + entry.type, data: d, cached: r._cached }))
          : { engine: 'se-' + entry.type, data: null };
      })
      .catch(() => ({ engine: 'se-' + entry.type, data: null }));
  }

  // Helper: merge raw results into allItems
  function mergeWaveResults(rawResults) {
    for (const res of rawResults) {
      if (!res || !res.data) {
        if (res && res.rateLimited) rateLimited = true;
        continue;
      }
      if (res.engine === 'approach-zero' || res.engine === 'approach-zero-raw') {
        const azItems = normalizeAZResults(res.data);
        stats.sources['Approach Zero'] = (stats.sources['Approach Zero'] || 0) + azItems.length;
        allItems = mergeResults(allItems, azItems);
        continue;
      }
      if (res.engine === 'google') {
        const gItems = (res.data.items || []).map(item => ({
          ...item, _source: item._source || 'google',
        }));
        stats.sources['Google'] = (stats.sources['Google'] || 0) + gItems.length;
        allItems = mergeResults(allItems, gItems);
        continue;
      }
      if (res.engine === 'se-mathoverflow') {
        const moItems = (res.data.items || []).map(item => {
          const norm = normalizeResult(item);
          norm._source = 'mathoverflow';
          norm.link = `https://mathoverflow.net/questions/${norm.question_id}`;
          return norm;
        });
        stats.sources['MathOverflow'] = (stats.sources['MathOverflow'] || 0) + moItems.length;
        allItems = mergeResults(allItems, moItems);
        continue;
      }
      const data = res.data;
      if (data.error_message) continue;
      if (quota === null && data.quota_remaining != null) quota = data.quota_remaining;
      if (data.has_more) anyHasMore = true;
      if (res.cached) stats.cached++;
      const items = (data.items || []).map(normalizeResult);
      const eng = res.engine.replace('se-', '');
      stats.sources[eng] = (stats.sources[eng] || 0) + items.length;
      allItems = mergeResults(allItems, items);
    }
  }

  // Helper: enrich and sort current results, then display
  async function rankAndDisplay(waveLabel) {
    if (thisId !== _latexSearchId) return;
    stats.totalResults = allItems.length;
    State.hasMore = anyHasMore;

    if (tex && allItems.length > 0) {
      showStatus(`${waveLabel} — Analyzing ${allItems.length} results…`);
      const rankStart = performance.now();
      allItems = await enrichAndRank(tex, allItems, thisId);
      stats.timing.rank = Math.round(performance.now() - rankStart);
      if (thisId !== _latexSearchId) return;
    }

    stats.timing.total = Math.round(performance.now() - startTime);
    stats.seQueryCount = Math.min(sortedPlan.length + variantQueries.length, 30);
    _lastSearchStats = stats;

    renderLatexResults(allItems, quota);
    lazyTypeset();
  }

  // ── Countdown timer (user-configurable duration) ──
  const durationSelect = document.getElementById('deepDuration');
  const DEEP_TOTAL_SEC = durationSelect ? parseInt(durationSelect.value, 10) || 180 : 180;
  // Scale wave delays proportionally to chosen duration
  // Base delays for 180s: 1.5s, 3s, 8s, 15s  → total ~27.5s of pauses
  const WAVE_SCALE = DEEP_TOTAL_SEC / 180;
  // Extended mode: ≥10 min → 10 waves with advanced analysis
  const EXTENDED_MODE = DEEP_TOTAL_SEC >= 600;
  const TOTAL_WAVES = EXTENDED_MODE ? 10 : 5;
  let _timerEl = document.getElementById('deepTimer');
  if (_timerEl) _timerEl.remove();
  _timerEl = document.createElement('div');
  _timerEl.id = 'deepTimer';
  _timerEl.className = 'deep-timer';
  const initMins = Math.floor(DEEP_TOTAL_SEC / 60);
  const initSecs = DEEP_TOTAL_SEC % 60;
  _timerEl.innerHTML = `
    <span class="dt-clock">${initMins}:${String(initSecs).padStart(2, '0')}</span>
    <div class="dt-bar-wrap"><div class="dt-bar" style="width:0%"></div></div>
    <span class="dt-wave">Wave 1/${TOTAL_WAVES}</span>`;
  const statusEl = document.querySelector('.status');
  if (statusEl && statusEl.parentNode) {
    statusEl.parentNode.insertBefore(_timerEl, statusEl.nextSibling);
  } else {
    DOM.results.parentNode.insertBefore(_timerEl, DOM.results);
  }
  const _timerStart = Date.now();
  const _timerInterval = setInterval(() => {
    const elapsed = (Date.now() - _timerStart) / 1000;
    const remain = Math.max(DEEP_TOTAL_SEC - elapsed, 0);
    const mins = Math.floor(remain / 60);
    const secs = Math.floor(remain % 60);
    const pct = Math.min((elapsed / DEEP_TOTAL_SEC) * 100, 100);
    const clockEl = _timerEl.querySelector('.dt-clock');
    const barEl = _timerEl.querySelector('.dt-bar');
    if (clockEl) clockEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
    if (barEl) barEl.style.width = pct + '%';
    if (remain <= 0) clearInterval(_timerInterval);
  }, 1000);
  function updateTimerWave(wave) {
    const waveEl = _timerEl.querySelector('.dt-wave');
    if (waveEl) waveEl.textContent = `Wave ${wave}/${TOTAL_WAVES}`;
  }
  function stopTimer() {
    clearInterval(_timerInterval);
    const clockEl = _timerEl.querySelector('.dt-clock');
    const barEl = _timerEl.querySelector('.dt-bar');
    if (clockEl) clockEl.textContent = '✓ Done';
    if (barEl) barEl.style.width = '100%';
    _timerEl.classList.add('done');
    const waveEl = _timerEl.querySelector('.dt-wave');
    const elapsed = Math.round((Date.now() - _timerStart) / 1000);
    if (waveEl) waveEl.textContent = `${elapsed}s`;
    setTimeout(() => { if (_timerEl.parentNode) _timerEl.style.opacity = '0.5'; }, 3000);
  }

  try {
    // ════════════════════ WAVE 1 (instant) ════════════════════
    // Top 3 SE queries + AZ primary (multi-page)
    updateTimerWave(1);
    showStatus(`🔍 Wave 1/${TOTAL_WAVES} — Primary search engines…`);
    const wave1 = [];
    const w1Plan = sortedPlan.slice(0, 3);
    wave1.push(...w1Plan.map(buildSEPromise));
    if (tex) {
      wave1.push(
        searchApproachZeroMultiPage(tex, 3)
          .then(data => ({ engine: 'approach-zero', data }))
      );
    }
    // SE /similar
    if (tex) {
      const simTitle = latexToNatural(tex);
      if (simTitle.length > 8) {
        const simParams = new URLSearchParams({
          order: 'desc', sort: 'relevance', site: Config.SITE,
          pagesize: '10', filter: Config.SE_FILTER, title: simTitle,
        });
        wave1.push(
          SearchCache.cachedFetch(`${Config.SE_API}/similar?${simParams}`, Config.SEARCH_TIMEOUT_MS)
            .then(r => r.ok ? r.json().then(d => ({ engine: 'se-similar', data: d })) : { engine: 'se-similar', data: null })
            .catch(() => ({ engine: 'se-similar', data: null }))
        );
      }
    }

    const w1Results = await Promise.all(wave1);
    if (thisId !== _latexSearchId) { stopTimer(); return; }
    mergeWaveResults(w1Results);
    stats.waves = 1;
    stats.timing.fetch = Math.round(performance.now() - startTime);

    // Display Wave 1 results immediately
    if (allItems.length > 0) {
      await rankAndDisplay(`Wave 1/${TOTAL_WAVES}`);
    }

    // ════════════════════ WAVE 2 (after ~5s × scale) ════════════════════
    // More SE queries + AZ variants + Google
    await new Promise(r => setTimeout(r, Math.round(1500 * WAVE_SCALE)));
    if (thisId !== _latexSearchId) { stopTimer(); return; }
    updateTimerWave(2);
    showStatus(`🔍 Wave 2/${TOTAL_WAVES} — Expanding search (${allItems.length} results so far)…`);

    const wave2 = [];
    const w2Plan = sortedPlan.slice(3, 9);
    wave2.push(...w2Plan.map(buildSEPromise));

    // AZ with notation variants
    if (tex) {
      const azVariants = allVariants.slice(0, 3);
      if (rawTex && rawTex !== tex && !azVariants.includes(rawTex)) {
        azVariants.unshift(rawTex);
      }
      for (const variant of azVariants.slice(0, 2)) {
        wave2.push(
          searchApproachZeroMultiPage(variant, 2)
            .then(data => ({ engine: 'approach-zero', data }))
        );
      }
    }

    // Google search
    if (tex) {
      const naturalForGoogle = latexToNatural(tex);
      if (naturalForGoogle.length > 8) {
        wave2.push(
          fetchGoogleForLatex(naturalForGoogle)
            .then(items => ({ engine: 'google', data: items && items.length ? { items } : null }))
            .catch(() => ({ engine: 'google', data: null }))
        );
      }
    }

    const w2Results = await Promise.all(wave2);
    if (thisId !== _latexSearchId) { stopTimer(); return; }
    mergeWaveResults(w2Results);
    stats.waves = 2;
    if (allItems.length > 0) await rankAndDisplay(`Wave 2/${TOTAL_WAVES}`);

    // ════════════════════ WAVE 3 (after ~15s × scale) ════════════════════
    // Variant queries + MathOverflow + Google with distinctive terms
    await new Promise(r => setTimeout(r, Math.round(3000 * WAVE_SCALE)));
    if (thisId !== _latexSearchId) { stopTimer(); return; }
    updateTimerWave(3);
    showStatus(`🔍 Wave 3/${TOTAL_WAVES} — Deep variant search (${allItems.length} results)…`);

    const wave3 = [];
    // Fire remaining sorted queries
    const w3Plan = sortedPlan.slice(9, 15);
    wave3.push(...w3Plan.map(buildSEPromise));
    // Variant-rewrite queries
    wave3.push(...variantQueries.slice(0, 4).map(buildSEPromise));

    // Google with distinctive sub-expressions
    if (tex) {
      const distExprs = extractDistinctiveSubexprs(tex);
      if (distExprs.length) {
        const opWord = /\\int/.test(tex) ? 'integral ' : /\\sum/.test(tex) ? 'sum ' : '';
        const gq = opWord + distExprs.slice(0, 3).join(' ');
        if (gq.length > 5) {
          wave3.push(
            fetchGoogleForLatex(gq)
              .then(items => ({ engine: 'google', data: items && items.length ? { items } : null }))
              .catch(() => ({ engine: 'google', data: null }))
          );
        }
      }
      // Google with raw LaTeX
      if (tex.length >= 15 && tex.length <= 120) {
        wave3.push(
          fetchGoogleForLatex(tex)
            .then(items => ({ engine: 'google', data: items && items.length ? { items } : null }))
            .catch(() => ({ engine: 'google', data: null }))
        );
      }
    }

    // MathOverflow
    if (tex) {
      const moNatural = latexToNatural(tex);
      if (moNatural.length > 10) {
        const moParams = new URLSearchParams({
          order: 'desc', sort: 'relevance', site: 'mathoverflow',
          pagesize: '8', q: moNatural,
        });
        wave3.push(
          SearchCache.cachedFetch(`${Config.SE_API}/search/excerpts?${moParams}`, Config.SEARCH_TIMEOUT_MS)
            .then(r => r.ok ? r.json().then(d => ({ engine: 'se-mathoverflow', data: d })) : { engine: 'se-mathoverflow', data: null })
            .catch(() => ({ engine: 'se-mathoverflow', data: null }))
        );
      }
    }

    const w3Results = await Promise.all(wave3);
    if (thisId !== _latexSearchId) { stopTimer(); return; }
    mergeWaveResults(w3Results);
    stats.waves = 3;
    if (allItems.length > 0) await rankAndDisplay(`Wave 3/${TOTAL_WAVES}`);

    // ════════════════════ WAVE 4 (after ~40s × scale) ════════════════════
    // Fire remaining variant queries + SE page 2 for top queries
    await new Promise(r => setTimeout(r, Math.round(8000 * WAVE_SCALE)));
    if (thisId !== _latexSearchId) { stopTimer(); return; }
    updateTimerWave(4);
    showStatus(`🔍 Wave 4/${TOTAL_WAVES} — Extended search (${allItems.length} results)…`);

    const wave4 = [];
    // Remaining variant queries
    wave4.push(...variantQueries.slice(4, 10).map(buildSEPromise));

    // SE page 2 for top 3 query types (if has_more)
    if (anyHasMore) {
      for (const entry of sortedPlan.slice(0, 3)) {
        wave4.push(buildSEPromise({ ...entry, sePage: 2 }));
      }
    }

    // AZ with more variants
    if (tex && allVariants.length > 3) {
      for (const variant of allVariants.slice(3, 5)) {
        wave4.push(
          searchApproachZeroMultiPage(variant, 2)
            .then(data => ({ engine: 'approach-zero', data }))
        );
      }
    }

    // Google with LaTeX fragment queries
    if (tex) {
      const frags = extractLatexFragments(tex);
      for (const frag of frags.slice(0, 2)) {
        wave4.push(
          fetchGoogleForLatex(frag)
            .then(items => ({ engine: 'google', data: items && items.length ? { items } : null }))
            .catch(() => ({ engine: 'google', data: null }))
        );
      }
    }

    const w4Results = await Promise.all(wave4);
    if (thisId !== _latexSearchId) { stopTimer(); return; }
    mergeWaveResults(w4Results);
    stats.waves = 4;
    if (allItems.length > 0) await rankAndDisplay(`Wave 4/${TOTAL_WAVES}`);

    // ════════════════════ WAVE 5 (after ~90s × scale) ════════════════════
    // Final exhaustive wave — remaining queries, page 3, broader terms
    await new Promise(r => setTimeout(r, Math.round(15000 * WAVE_SCALE)));
    if (thisId !== _latexSearchId) { stopTimer(); return; }
    updateTimerWave(5);
    showStatus(`🔍 Wave 5/${TOTAL_WAVES} — ${EXTENDED_MODE ? 'Exhaustive search' : 'Final exhaustive search'} (${allItems.length} results)…`);

    const wave5 = [];
    // Remaining queries from sorted plan
    const w5Plan = sortedPlan.slice(15);
    wave5.push(...w5Plan.map(buildSEPromise));

    // SE page 3 for top query if still has_more
    if (anyHasMore) {
      wave5.push(buildSEPromise({ ...sortedPlan[0], sePage: 3 }));
    }

    // Broader natural-language Google search
    if (tex) {
      const readable = latexToReadable(tex);
      if (readable.length > 8) {
        wave5.push(
          fetchGoogleForLatex('evaluate ' + readable)
            .then(items => ({ engine: 'google', data: items && items.length ? { items } : null }))
            .catch(() => ({ engine: 'google', data: null }))
        );
      }
    }

    // Cross-site: search on Physics, Stats, CompSci SE
    if (tex) {
      const crossNatural = latexToNatural(tex);
      if (crossNatural.length > 10) {
        for (const site of ['physics', 'stats']) {
          const csParams = new URLSearchParams({
            order: 'desc', sort: 'relevance', site,
            pagesize: '3', q: crossNatural,
          });
          wave5.push(
            SearchCache.cachedFetch(`${Config.SE_API}/search/excerpts?${csParams}`, Config.SEARCH_TIMEOUT_MS)
              .then(r => r.ok ? r.json().then(d => ({ engine: 'se-' + site, data: d })) : { engine: 'se-' + site, data: null })
              .catch(() => ({ engine: 'se-' + site, data: null }))
          );
        }
      }
    }

    const w5Results = await Promise.all(wave5);
    if (thisId !== _latexSearchId) { stopTimer(); return; }
    mergeWaveResults(w5Results);
    stats.waves = 5;

    if (allItems.length > 0) await rankAndDisplay(`Wave 5/${TOTAL_WAVES}`);

    // ════════════════════════════════════════════════════════════
    // EXTENDED WAVES 6–10 (only when user picks ≥10 min)
    // Advanced integral rewriting, aggressive LaTeX variants,
    // method-specific queries, deeper AZ/Google/cross-site scans
    // ════════════════════════════════════════════════════════════
    if (EXTENDED_MODE && tex) {
      // Pre-compute advanced rewrites for use across waves 6-10
      const integralRewrites = advancedIntegralRewrites(tex);
      const aggressiveRewrites = deepAggressiveRewrites(tex);
      const allRewrites = [...new Set([...integralRewrites, ...aggressiveRewrites])];

      // Extended wave delay: spread remaining time across 5 extra waves
      // After wave 5, we've used ~(1.5+3+8+15)*scale seconds of delay.
      // Remaining budget per wave for waves 6-10:
      const EXT_DELAY = Math.round(((DEEP_TOTAL_SEC * 0.6) / 5) * 1000); // ~60% of total / 5

      // ════════════════════ WAVE 6 — Integral rewriting ════════════════════
      await new Promise(r => setTimeout(r, EXT_DELAY));
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      updateTimerWave(6);
      showStatus(`🧮 Wave 6/${TOTAL_WAVES} — Advanced integral rewriting (${allItems.length} results)…`);

      const wave6 = [];
      // Fire integral-specific rewrites as SE queries
      const w6Rewrites = integralRewrites.slice(0, 12);
      for (const rw of w6Rewrites) {
        if (rw.startsWith('\\') || /\\frac|\\int|\\sum/.test(rw)) {
          // LaTeX rewrite → search as raw LaTeX
          wave6.push(buildSEPromise({ type: 'integral-rewrite', q: rw }));
        } else {
          // Natural language method query
          wave6.push(buildSEPromise({ type: 'method-query', q: rw }));
        }
      }

      // AZ with integral rewrites
      const azIntRewrites = integralRewrites.filter(r => r.startsWith('\\') && r.length > 10);
      for (const azR of azIntRewrites.slice(0, 3)) {
        wave6.push(
          searchApproachZeroMultiPage(azR, 2)
            .then(data => ({ engine: 'approach-zero', data }))
        );
      }

      const w6Results = await Promise.all(wave6);
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      mergeWaveResults(w6Results);
      stats.waves = 6;
      if (allItems.length > 0) await rankAndDisplay(`Wave 6/${TOTAL_WAVES}`);

      // ════════════════════ WAVE 7 — Method-specific deep search ════════════════════
      await new Promise(r => setTimeout(r, EXT_DELAY));
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      updateTimerWave(7);
      showStatus(`📐 Wave 7/${TOTAL_WAVES} — Method-specific search (${allItems.length} results)…`);

      const wave7 = [];
      // Natural language method queries (substitution, by-parts, partial fractions, etc.)
      const methodQueries = integralRewrites.filter(r => !r.startsWith('\\') && r.length > 10);
      for (const mq of methodQueries.slice(0, 10)) {
        wave7.push(buildSEPromise({ type: 'method-natural', q: mq }));
      }

      // Google with method-specific queries
      for (const mq of methodQueries.slice(0, 4)) {
        wave7.push(
          fetchGoogleForLatex(mq)
            .then(items => ({ engine: 'google', data: items && items.length ? { items } : null }))
            .catch(() => ({ engine: 'google', data: null }))
        );
      }

      // Search on more cross-sites with method queries
      const methodForCS = methodQueries[0] || latexToNatural(tex);
      if (methodForCS.length > 8) {
        for (const site of ['physics', 'stats', 'scicomp', 'cs']) {
          const csParams = new URLSearchParams({
            order: 'desc', sort: 'relevance', site,
            pagesize: '5', q: methodForCS,
          });
          wave7.push(
            SearchCache.cachedFetch(`${Config.SE_API}/search/excerpts?${csParams}`, Config.SEARCH_TIMEOUT_MS)
              .then(r => r.ok ? r.json().then(d => ({ engine: 'se-' + site, data: d })) : { engine: 'se-' + site, data: null })
              .catch(() => ({ engine: 'se-' + site, data: null }))
          );
        }
      }

      const w7Results = await Promise.all(wave7);
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      mergeWaveResults(w7Results);
      stats.waves = 7;
      if (allItems.length > 0) await rankAndDisplay(`Wave 7/${TOTAL_WAVES}`);

      // ════════════════════ WAVE 8 — Aggressive notation variants ════════════════════
      await new Promise(r => setTimeout(r, EXT_DELAY));
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      updateTimerWave(8);
      showStatus(`🔬 Wave 8/${TOTAL_WAVES} — Aggressive notation analysis (${allItems.length} results)…`);

      const wave8 = [];
      // Deep aggressive rewrites (dfrac, tfrac, displaystyle, exp↔e^, |x|↔\lvert, etc.)
      const w8Rewrites = aggressiveRewrites.slice(0, 15);
      for (const rw of w8Rewrites) {
        if (/\\/.test(rw) && rw.length >= 8) {
          wave8.push(buildSEPromise({ type: 'aggressive-rewrite', q: rw }));
        }
      }

      // AZ with aggressive notation variants
      const azAggrRewrites = aggressiveRewrites.filter(r => /\\(int|frac|sum)/.test(r));
      for (const azR of azAggrRewrites.slice(0, 4)) {
        wave8.push(
          searchApproachZeroMultiPage(azR, 3)
            .then(data => ({ engine: 'approach-zero', data }))
        );
      }

      // Google with exact LaTeX fragments from rewrites
      for (const rw of w8Rewrites.slice(0, 3)) {
        if (rw.length > 10 && rw.length < 120) {
          wave8.push(
            fetchGoogleForLatex(rw)
              .then(items => ({ engine: 'google', data: items && items.length ? { items } : null }))
              .catch(() => ({ engine: 'google', data: null }))
          );
        }
      }

      const w8Results = await Promise.all(wave8);
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      mergeWaveResults(w8Results);
      stats.waves = 8;
      if (allItems.length > 0) await rankAndDisplay(`Wave 8/${TOTAL_WAVES}`);

      // ════════════════════ WAVE 9 — Deep page scanning ════════════════════
      await new Promise(r => setTimeout(r, EXT_DELAY));
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      updateTimerWave(9);
      showStatus(`📄 Wave 9/${TOTAL_WAVES} — Deep page scanning (${allItems.length} results)…`);

      const wave9 = [];
      // SE pages 3-5 for top queries
      for (const entry of sortedPlan.slice(0, 5)) {
        for (const pg of [3, 4, 5]) {
          wave9.push(buildSEPromise({ ...entry, sePage: pg }));
        }
      }

      // AZ pages 4-6 with original tex
      if (tex) {
        for (let azP = 4; azP <= 6; azP++) {
          wave9.push(
            searchApproachZero(tex, azP)
              .then(data => ({ engine: 'approach-zero', data }))
          );
        }
      }

      // AZ with all notation variants deep pages
      for (const variant of allVariants.slice(5, 10)) {
        wave9.push(
          searchApproachZeroMultiPage(variant, 4)
            .then(data => ({ engine: 'approach-zero', data }))
        );
      }

      const w9Results = await Promise.all(wave9);
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      mergeWaveResults(w9Results);
      stats.waves = 9;
      if (allItems.length > 0) await rankAndDisplay(`Wave 9/${TOTAL_WAVES}`);

      // ════════════════════ WAVE 10 — Final exhaustive sweep ════════════════════
      await new Promise(r => setTimeout(r, EXT_DELAY));
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      updateTimerWave(10);
      showStatus(`🏁 Wave 10/${TOTAL_WAVES} — Final exhaustive sweep (${allItems.length} results)…`);

      const wave10 = [];
      // Remaining rewrites not yet searched
      const remainingRewrites = allRewrites.slice(25);
      for (const rw of remainingRewrites.slice(0, 15)) {
        if (/\\/.test(rw)) {
          wave10.push(buildSEPromise({ type: 'final-rewrite', q: rw }));
        } else if (rw.length > 8) {
          wave10.push(buildSEPromise({ type: 'final-natural', q: rw }));
        }
      }

      // Google with broader terms
      const readable = latexToReadable(tex);
      if (readable.length > 5) {
        const broadQueries = [
          'solve ' + readable,
          'prove ' + readable,
          'closed form ' + readable,
          'elementary proof ' + readable,
          'alternative solution ' + readable,
        ];
        for (const bq of broadQueries) {
          wave10.push(
            fetchGoogleForLatex(bq)
              .then(items => ({ engine: 'google', data: items && items.length ? { items } : null }))
              .catch(() => ({ engine: 'google', data: null }))
          );
        }
      }

      // Cross-site sweep: hsm (History of Science and Math), MO page 2
      if (tex) {
        const moNatural = latexToNatural(tex);
        if (moNatural.length > 10) {
          for (const site of ['mathoverflow', 'hsm']) {
            for (const pg of [2, 3]) {
              const csParams = new URLSearchParams({
                order: 'desc', sort: 'relevance', site,
                page: String(pg), pagesize: '10', q: moNatural,
              });
              wave10.push(
                SearchCache.cachedFetch(`${Config.SE_API}/search/excerpts?${csParams}`, Config.SEARCH_TIMEOUT_MS)
                  .then(r => r.ok ? r.json().then(d => ({ engine: 'se-' + site, data: d })) : { engine: 'se-' + site, data: null })
                  .catch(() => ({ engine: 'se-' + site, data: null }))
              );
            }
          }
        }
      }

      const w10Results = await Promise.all(wave10);
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      mergeWaveResults(w10Results);
      stats.waves = 10;
    }
    // ════════════════════ END EXTENDED WAVES ════════════════════

    // ════════════════════ FINAL DISPLAY ════════════════════
    if (!allItems.length && rateLimited) {
      throw new Error('API rate limit reached. Please wait or add an SE API key in config.js.');
    }
    if (!allItems.length) {
      throw new Error(`No results found after exhaustive ${TOTAL_WAVES}-wave search. Try different LaTeX or keywords.`);
    }

    await rankAndDisplay(`Complete — all ${stats.waves} waves`);
    stopTimer();
    showStatus(`✅ Deep search complete — ${allItems.length} results across ${stats.waves} waves in ${Math.round((performance.now() - startTime)/1000)}s${EXTENDED_MODE ? ' (advanced analysis)' : ''}`);

  } catch (err) {
    stopTimer();
    if (thisId !== _latexSearchId) return;
    if (err.name === 'AbortError') showError('Request timed out. Try again.');
    else showError(err.message);
  }
}

/* ================================================================
   RESULT NORMALIZATION & MERGE
   ================================================================ */

function normalizeResult(item) {
  if (item.item_type) {
    return {
      question_id      : item.question_id,
      title            : item.title || 'Untitled',
      link             : `https://math.stackexchange.com/questions/${item.question_id}`,
      score            : item.score ?? 0,
      answer_count     : item.answer_count ?? 0,
      view_count       : item.view_count ?? 0,
      creation_date    : item.creation_date,
      accepted_answer_id: item.accepted_answer_id,
      tags             : item.tags || [],
      owner            : item.owner || {},
      excerpt          : item.excerpt || item.body || '',
      item_type        : item.item_type,
      _source          : 'se-excerpts',
    };
  }
  return { ...item, _source: item._source || 'se-advanced' };
}

function mergeResults(primary, secondary) {
  const seen = new Set(primary.map(i => i.question_id));
  const extra = secondary.filter(i => i.question_id && !seen.has(i.question_id));
  return [...primary, ...extra];
}

/* ================================================================
   PHASE 3: ENRICH + RE-RANK
   ================================================================ */

async function enrichAndRank(queryTex, items, thisId) {
  // Increase limit from 30 to 50 for deeper coverage
  const ids = [...new Set(items.map(i => i.question_id).filter(Boolean))].slice(0, 50);
  if (!ids.length) return MathSimilarity.rankResults(queryTex, items);

  // PHASE 3a: Fetch full bodies + answers
  try {
    items = await enrichWithBodiesAndAnswers(items, thisId, '_latexSearchId');
    if (thisId !== _latexSearchId) return items;
  } catch (_e) { /* proceed with title+excerpt scoring */ }

  // PHASE 3b: Body-content LaTeX string matching
  // Scan fetched bodies for LaTeX strings matching the query formula.
  // Items whose body contains the exact query LaTeX get a boost.
  if (queryTex) {
    const queryNorm = queryTex.replace(/\s+/g, '').toLowerCase();
    const queryShort = queryNorm.slice(0, 60); // prefix match for long formulas
    for (const item of items) {
      if (!item.body) continue;
      // Extract all LaTeX from body HTML
      const bodyFormulas = MathSimilarity.extractFormulas(item.body);
      // Also check answer bodies
      const ansFormulas = [];
      if (item.answers) {
        for (const ans of item.answers) {
          if (ans.body) ansFormulas.push(...MathSimilarity.extractFormulas(ans.body));
        }
      }
      const allFormulas = [...bodyFormulas, ...ansFormulas];
      let bodyLatexBoost = 0;
      for (const f of allFormulas) {
        const fNorm = f.replace(/\s+/g, '').toLowerCase();
        if (fNorm === queryNorm) {
          bodyLatexBoost = 0.25; // Exact match in body
          break;
        } else if (fNorm.includes(queryShort) || queryNorm.includes(fNorm.slice(0, 60))) {
          bodyLatexBoost = Math.max(bodyLatexBoost, 0.12); // Partial match
        }
      }
      item._bodyLatexBoost = bodyLatexBoost;
    }
  }

  // PHASE 3c: Related + Linked question chain scanning
  // Find related/linked questions from top results (like text search Phase 2b)
  if (typeof SearchEnhance !== 'undefined' && items.length > 0) {
    const topIds = items.slice(0, 5).map(i => i.question_id).filter(Boolean);
    if (topIds.length > 0) {
      try {
        const [relItems, lnkItems] = await Promise.all([
          SearchEnhance.fetchRelated(topIds).catch(() => []),
          SearchEnhance.fetchLinked(topIds).catch(() => []),
        ]);
        if (thisId !== _latexSearchId) return items;

        const extraItems = [...relItems, ...lnkItems];
        if (extraItems.length > 0) {
          const existingIds = new Set(items.map(i => i.question_id));
          const newItems = extraItems.filter(i => i.question_id && !existingIds.has(i.question_id));
          if (newItems.length > 0) {
            const enrichedNew = await enrichWithBodiesAndAnswers(newItems, thisId, '_latexSearchId');
            if (thisId !== _latexSearchId) return items;
            items = items.concat(enrichedNew);
          }
        }
      } catch (_) { /* related/linked fetch failed, continue */ }
    }
  }

  // PHASE 3d: Structural similarity ranking (ARQMath-style)
  let ranked = MathSimilarity.rankResults(queryTex, items);

  // Apply body-content LaTeX boost and AZ structural score boost
  for (const item of ranked) {
    const boost = (item._bodyLatexBoost || 0) + (item._azScore ? Math.min(item._azScore / 1000, 0.15) : 0);
    if (boost > 0) {
      item._similarity = Math.min((item._similarity || 0) + boost, 1.0);
    }
  }

  // Multi-source concordance: items found by 3+ engines get a bonus
  const idCount = new Map();
  for (const item of items) {
    const qid = item.question_id;
    if (!qid) continue;
    idCount.set(qid, (idCount.get(qid) || 0) + 1);
  }
  for (const item of ranked) {
    const count = idCount.get(item.question_id) || 1;
    if (count >= 3) {
      item._similarity = Math.min((item._similarity || 0) + 0.05 * (count - 2), 1.0);
    }
  }

  // Ensure EVERY result has a non-zero _similarity so it displays a percentage
  for (const item of ranked) {
    if (!item._similarity || item._similarity <= 0) {
      // Compute a base score from SE score + answer count
      const seBase = Math.min((item.score || 0) / 200, 0.15);
      const ansBase = item.accepted_answer_id ? 0.05 : 0;
      const viewBase = Math.min((item.view_count || 0) / 50000, 0.05);
      item._similarity = Math.max(seBase + ansBase + viewBase, 0.01);
    }
  }

  // STRICT sort by percentage descending (100% → 1%)
  ranked.sort((a, b) => {
    const d = (b._similarity || 0) - (a._similarity || 0);
    if (Math.abs(d) > 0.001) return d;
    // Tie-break: SE score, then views
    const sd = (b.score || 0) - (a.score || 0);
    if (sd !== 0) return sd;
    return (b.view_count || 0) - (a.view_count || 0);
  });

  return ranked;
}

/* ================================================================
   RENDER
   ================================================================ */

function renderLatexResults(items, quota) {
  if (!items.length) {
    const queryTex = DOM.latexInput.value.trim();
    let msg = 'No results found. Try different LaTeX or keywords.';
    if (queryTex) {
      const googleQ = encodeURIComponent('site:math.stackexchange.com ' + queryTex);
      msg += ` <a class="google-inline-link" href="https://www.google.com/search?q=${googleQ}" target="_blank" rel="noopener">&#128269; Search on Google</a>`;
    }
    showStatus(msg);
    return;
  }

  const quotaStr = quota != null ? `  (API quota: ${quota})` : '';
  const pageSize = Math.min(parseInt(DOM.pageSize?.value || '20', 10) || 20, 20);
  const visibleItems = items.slice(0, pageSize);
  if (typeof _lastSearchResults !== 'undefined') {
    _lastSearchResults = items;
    _lastSearchQuery = DOM.latexInput ? DOM.latexInput.value.trim() : '';
  }
  showStatus(`Page ${State.currentPage} - showing ${visibleItems.length} of ${items.length} results${quotaStr}`);

  const frag = document.createDocumentFragment();

  visibleItems.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'az-result-card';

    const date = item.creation_date
      ? new Date(item.creation_date * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : '';
    const tags     = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    const accepted = item.accepted_answer_id ? '<span class="accepted">&#10003; Accepted</span>' : '';

    // Source badge
    let sourceBadge = '';
    if (item._source === 'approach-zero') {
      sourceBadge = '<span class="source-badge source-az" title="Found by Approach Zero structural search">AZ</span> ';
    } else if (item._source === 'google') {
      sourceBadge = '<span class="source-badge source-google" title="Found via Google site-search">G</span> ';
    } else if (item._source === 'mathoverflow') {
      sourceBadge = '<span class="source-badge source-mathoverflow" title="Found on MathOverflow">MO</span> ';
    } else if (item.item_type === 'answer') {
      sourceBadge = '<span class="source-badge source-answer" title="Found in an answer">ANS</span> ';
    }

    // Similarity badge — ALWAYS shown as percentage (100% → 1%)
    const sim = item._similarity || 0;
    const pct = Math.max(Math.round(sim * 100), 1);
    const cls = pct >= 70 ? 'sim-high' : pct >= 40 ? 'sim-med' : 'sim-low';
    const simBadge = `<span class="sim-badge ${cls}" title="Match confidence: ${pct}% — structural + keyword + body analysis">${pct}%</span> `;

    // Question body (collapsible)
    let bodyHtml = '';
    if (item.body) {
      const isLong = item.body.length > 400;
      bodyHtml = `
        <div class="qa-body question-body">
          <div class="qa-body-label">&#128221; Question</div>
          <div class="qa-body-content ${isLong ? 'collapsed' : ''}">${item.body}</div>
          ${isLong ? `<button class="qa-toggle" onclick="toggleQABody(this)" data-state="collapsed">Show full question &#9660;</button>` : ''}
        </div>`;
    } else if (item.excerpt) {
      bodyHtml = `<div class="result-snippet">${item.excerpt}</div>`;
    }

    // Answers section
    let answersHtml = '';
    if (item.answers && item.answers.length > 0) {
      const ansCards = item.answers.map((ans) => {
        const ansAccepted = ans.is_accepted ? '<span class="accepted-answer-badge">&#10003; Accepted Answer</span>' : '';
        const ansDate = ans.creation_date
          ? new Date(ans.creation_date * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : '';
        const ansIsLong = ans.body.length > 400;

        return `
          <div class="answer-card ${ans.is_accepted ? 'answer-accepted' : ''}">
            <div class="answer-header">
              ${ansAccepted}
              <span class="answer-score">&#9650; ${ans.score}</span>
              ${ans.owner?.display_name ? `<span class="answer-author">by ${ans.owner.display_name}</span>` : ''}
              ${ansDate ? `<span class="answer-date">${ansDate}</span>` : ''}
            </div>
            <div class="qa-body-content ${ansIsLong ? 'collapsed' : ''}">${ans.body}</div>
            ${ansIsLong ? `<button class="qa-toggle" onclick="toggleQABody(this)" data-state="collapsed">Show full answer &#9660;</button>` : ''}
          </div>`;
      }).join('');

      const countLabel = item.answers.length === 1 ? '1 Answer' : `${item.answers.length} Answers`;
      answersHtml = `
        <div class="answers-section">
          <div class="answers-header" onclick="toggleAnswers(this)">
            <span>&#128172; ${countLabel}</span>
            <span class="answers-toggle-icon">&#9660;</span>
          </div>
          <div class="answers-list collapsed">${ansCards}</div>
        </div>`;
    }

    card.innerHTML = `
      <h3>
        ${simBadge}${sourceBadge}
        <a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>
      </h3>
      ${bodyHtml}
      ${answersHtml}
      <div class="meta">
        <span>&#9650; ${item.score}</span>
        <span>&#128172; ${item.answer_count ?? '?'} answers</span>
        ${accepted}
        ${item.view_count ? `<span>&#128065; ${item.view_count} views</span>` : ''}
        ${date ? `<span>&#128197; ${date}</span>` : ''}
        ${item.owner?.display_name ? `<span>by ${item.owner.display_name}</span>` : ''}
      </div>
      ${tags ? `<div class="tags">${tags}</div>` : ''}`;

    frag.appendChild(card);
  });

  DOM.results.innerHTML = '';
  DOM.results.appendChild(frag);

  // Google fallback link
  const queryTex = DOM.latexInput.value.trim();
  if (queryTex) {
    const googleQ = encodeURIComponent('site:math.stackexchange.com ' + queryTex);
    const fallback = document.createElement('div');
    fallback.className = 'google-fallback';
    fallback.innerHTML = `
      <span>Not finding the exact question?</span>
      <a href="https://www.google.com/search?q=${googleQ}" target="_blank" rel="noopener">
        &#128269; Try Google site-search
      </a>`;
    DOM.results.appendChild(fallback);
  }

  renderPagination(searchLatex);
}

/* ================================================================
   SEARCH ANALYTICS PANEL
   ================================================================ */

function renderSearchAnalytics(stats) {
  const old = document.getElementById('searchAnalytics');
  if (old) old.remove();

  const sources = Object.entries(stats.sources)
    .map(([k, v]) => `<span class="analytics-chip">${k}: ${v}</span>`)
    .join('');

  const azStatus = _azAvailable
    ? '<span class="analytics-chip" style="background:#2a623a;color:#a3f0bf">AZ: OK</span>'
    : '<span class="analytics-chip" style="background:#7a2a2a;color:#f0a3a3">AZ: DOWN</span>';

  const panel = document.createElement('div');
  panel.id = 'searchAnalytics';
  panel.className = 'search-analytics';
  panel.innerHTML = `
    <div class="analytics-toggle" onclick="this.parentElement.classList.toggle('expanded')">
      &#9881; Search Analytics
      <span class="analytics-summary">${stats.totalResults} results in ${stats.timing.total}ms</span>
    </div>
    <div class="analytics-body">
      <div class="analytics-row">
        <strong>Sources:</strong> ${sources || 'none'} ${azStatus}
      </div>
      <div class="analytics-row">
        <strong>Timing:</strong>
        Fetch: ${stats.timing.fetch || 0}ms
        ${stats.timing.rank ? ` &middot; Rank+Enrich: ${stats.timing.rank}ms` : ''}
        &middot; Total: ${stats.timing.total}ms
      </div>
      <div class="analytics-row">
        <strong>Waves:</strong> ${stats.waves || 1}/5
        &middot; <strong>Cache hits:</strong> ${stats.cached || 0}
        &middot; <strong>Strategies:</strong> ${Object.keys(stats.sources).length}
        &middot; <strong>Engines:</strong> AZ(multi-page) + SE(${stats.seQueryCount || '?'}) + Google + MO + Physics + Stats
      </div>
    </div>`;

  DOM.results.parentNode.insertBefore(panel, DOM.results);
}

function lazyTypeset() {
  requestAnimationFrame(() => typesetResults());
}
