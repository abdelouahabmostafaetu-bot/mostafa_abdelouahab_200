/* ================================================================
   math-similarity.js — Maximum Subtree Similarity for LaTeX
   ================================================================
   Client-side structural similarity engine inspired by MathWebSearch.

   1. Parses LaTeX into expression trees (AST)
   2. Computes Maximum Subtree Similarity between formula trees
   3. Re-ranks search results so structurally similar formulas
      appear first — even if SE's text search ranked them lower.

   Algorithm (simplified MathWebSearch approach):
     - Parse query and each candidate formula into trees
     - For every subtree of the candidate, compute structural
       overlap with the query tree
     - The candidate's score = max overlap across all its subtrees
     - Results are sorted by this similarity score

   Reference:  https://github.com/MathWebSearch
   ================================================================ */

const MathSimilarity = (() => {

  /* ================================================================
     AST NODE
     ================================================================ */
  function N(type, val, children) {
    return { t: type, v: val || '', c: children || [] };
  }

  /* ================================================================
     TOKENIZER
     ================================================================ */
  function tokenize(tex) {
    const toks = [];
    let i = 0;
    const len = tex.length;

    while (i < len) {
      const ch = tex[i];

      // Whitespace
      if (/\s/.test(ch)) { i++; continue; }

      // LaTeX command  \word
      if (ch === '\\') {
        let cmd = '\\';
        i++;
        if (i < len && /[a-zA-Z]/.test(tex[i])) {
          while (i < len && /[a-zA-Z]/.test(tex[i])) cmd += tex[i++];
          toks.push(['cmd', cmd]);
        } else if (i < len) {
          toks.push(['esc', tex[i++]]);            // \{ \} etc.
        }
        continue;
      }

      // Number
      if (/\d/.test(ch)) {
        let num = '';
        while (i < len && /[\d.]/.test(tex[i])) num += tex[i++];
        toks.push(['num', num]);
        continue;
      }

      // Differential  dx, dy, dt  (heuristic: 'd' + single letter)
      if (ch === 'd' && i + 1 < len && /[a-z]/.test(tex[i + 1]) &&
          (i === 0 || /[\s{}^_+\-*/()=,]/.test(tex[i - 1]))) {
        toks.push(['diff', 'd' + tex[i + 1]]);
        i += 2;
        continue;
      }

      // Single-letter variable
      if (/[a-zA-Z]/.test(ch)) {
        toks.push(['var', ch]);
        i++;
        continue;
      }

      // Structural tokens
      const map = {
        '{': 'lbr', '}': 'rbr', '(': 'lp', ')': 'rp',
        '[': 'lsb', ']': 'rsb',
        '^': 'sup', '_': 'sub',
        '+': 'op', '-': 'op', '*': 'op', '/': 'op',
        '=': 'op', '<': 'op', '>': 'op', '!': 'op', ',': 'op',
      };
      if (map[ch]) { toks.push([map[ch], ch]); i++; continue; }

      i++;   // skip unknown
    }
    return toks;
  }

  /* ================================================================
     RECURSIVE-DESCENT PARSER   LaTeX → tree
     ================================================================ */
  function parse(tex) {
    if (!tex || typeof tex !== 'string') return N('empty');
    const toks = tokenize(tex.trim());
    let pos = 0;

    const peek  = ()     => pos < toks.length ? toks[pos] : null;
    const at    = (type) => { const t = peek(); return t && t[0] === type; };
    const eat   = (type) => { if (at(type)) return toks[pos++]; return null; };
    const next  = ()     => pos < toks.length ? toks[pos++] : null;

    /* ── brace group: { … } ── */
    function braceGroup() {
      if (!eat('lbr')) return N('empty');
      const nodes = collectUntil('rbr');
      eat('rbr');
      return nodes.length === 1 ? nodes[0] : N('grp', '{}', nodes);
    }

    /* ── paren group: ( … ) ── */
    function parenGroup() {
      eat('lp');
      const nodes = collectUntil('rp');
      eat('rp');
      return nodes.length === 1 ? nodes[0] : N('grp', '()', nodes);
    }

    /* ── collect atoms until stop token ── */
    function collectUntil(stopType) {
      const nodes = [];
      while (peek() && peek()[0] !== stopType) {
        const n = atom();
        if (n) nodes.push(n);
      }
      return nodes;
    }

    /* ── single primary without postfix handling ── */
    function primarySimple() {
      const t = peek();
      if (!t) return N('empty');
      if (at('num'))  { next(); return N('num', t[1]); }
      if (at('var'))  { next(); return N('var', t[1]); }
      if (at('cmd'))  return command();
      if (at('lbr'))  return braceGroup();
      if (at('lp'))   return parenGroup();
      next(); return N('other', t[1]);
    }

    /* ── atom = primary + optional ^{} _{} ── */
    function atom() {
      let node = primary();
      if (!node) return null;

      // attach superscripts / subscripts
      while (peek() && (at('sup') || at('sub'))) {
        const isSup = at('sup');
        next();                     // consume ^ or _
        const arg = at('lbr') ? braceGroup() : primarySimple();
        node = N(isSup ? 'pow' : 'idx', isSup ? '^' : '_', [node, arg]);
      }
      return node;
    }

    /* ── primary: num | var | cmd | group | op ── */
    function primary() {
      const t = peek();
      if (!t) return null;
      if (at('num'))   { next(); return N('num',  t[1]); }
      if (at('var'))   { next(); return N('var',  t[1]); }
      if (at('diff'))  { next(); return N('diff', t[1]); }
      if (at('op'))    { next(); return N('op',   t[1]); }
      if (at('lbr'))   return braceGroup();
      if (at('lp'))    return parenGroup();
      if (at('cmd'))   return command();
      if (at('esc'))   { next(); return N('other', t[1]); }
      next(); return N('other', t[1]);
    }

    /* ── command dispatcher ── */
    function command() {
      const t = next();
      const name = t[1].slice(1);          // strip leading backslash

      // ── \frac{num}{denom} ──
      if (/^[dtc]?frac$/.test(name)) {
        const num = at('lbr') ? braceGroup() : primarySimple();
        const den = at('lbr') ? braceGroup() : primarySimple();
        return N('frac', 'frac', [num, den]);
      }

      // ── \int  \iint  \oint ──
      if (/^i+nt$|^oint$/.test(name)) {
        const ch = [];
        if (at('sub')) { next(); ch.push(N('lo', '_', [at('lbr') ? braceGroup() : primarySimple()])); }
        if (at('sup')) { next(); ch.push(N('hi', '^', [at('lbr') ? braceGroup() : primarySimple()])); }
        return N('int', 'int', ch);
      }

      // ── \sum  \prod ──
      if (name === 'sum' || name === 'prod') {
        const ch = [];
        if (at('sub')) { next(); ch.push(N('lo', '_', [at('lbr') ? braceGroup() : primarySimple()])); }
        if (at('sup')) { next(); ch.push(N('hi', '^', [at('lbr') ? braceGroup() : primarySimple()])); }
        return N(name, name, ch);
      }

      // ── \lim ──
      if (name === 'lim') {
        const ch = [];
        if (at('sub')) { next(); ch.push(at('lbr') ? braceGroup() : primarySimple()); }
        return N('lim', 'lim', ch);
      }

      // ── \sqrt{x} ──
      if (name === 'sqrt') {
        if (at('lsb')) { next(); collectUntil('rsb'); eat('rsb'); }   // skip optional [n]
        const child = at('lbr') ? braceGroup() : primarySimple();
        return N('sqrt', 'sqrt', [child]);
      }

      // ── \binom{n}{k} ──
      if (/^[d]?binom$/.test(name)) {
        const a = at('lbr') ? braceGroup() : primarySimple();
        const b = at('lbr') ? braceGroup() : primarySimple();
        return N('binom', 'binom', [a, b]);
      }

      // ── trig / log / special functions ──
      const funcs = [
        'sin','cos','tan','sec','csc','cot',
        'ln','log','exp',
        'arcsin','arccos','arctan',
        'sinh','cosh','tanh',
        'det','max','min','gcd',
      ];
      if (funcs.includes(name)) {
        const ch = [];
        if (at('lp'))  ch.push(parenGroup());
        else if (at('lbr')) ch.push(braceGroup());
        return N('fn', name, ch);
      }

      // ── greek / symbols ──
      const syms = [
        'alpha','beta','gamma','delta','epsilon','varepsilon',
        'zeta','eta','theta','vartheta','iota','kappa','lambda',
        'mu','nu','xi','pi','rho','sigma','tau','upsilon',
        'phi','varphi','chi','psi','omega',
        'Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma',
        'Upsilon','Phi','Psi','Omega',
        'infty','partial','nabla','forall','exists','emptyset',
        'aleph','hbar','ell','cdot','times','to','rightarrow',
        'leftarrow','Rightarrow','Leftarrow','mapsto',
        'in','notin','subset','subseteq','cup','cap',
        'leq','geq','neq','approx','equiv','sim','propto',
      ];
      if (syms.includes(name)) return N('sym', name);

      // ── spacing & decoration — skip ──
      const skip = [
        'quad','qquad','text','mathrm','mathbf','mathit','mathbb',
        'mathcal','mathscr','operatorname',
        'left','right','big','Big','bigg','Bigg',
        'displaystyle','textstyle','scriptstyle',
        'overline','underline','hat','bar','vec','tilde','dot','ddot',
      ];
      if (skip.includes(name)) {
        if (at('lbr') && /text|math|operator/.test(name)) return braceGroup();
        return null;                     // invisible node
      }

      // ── fallback: generic command ──
      const ch = [];
      if (at('lbr')) ch.push(braceGroup());
      if (at('lbr')) ch.push(braceGroup());
      return N('cmd', name, ch);
    }

    /* ── parse top level ── */
    const children = [];
    while (pos < toks.length) {
      const n = atom();
      if (n) children.push(n);
    }
    if (children.length === 0) return N('empty');
    if (children.length === 1) return children[0];
    return N('expr', 'root', children);
  }

  /* ================================================================
     TREE UTILITIES
     ================================================================ */
  function treeSize(n) {
    if (!n) return 0;
    return 1 + n.c.reduce((s, ch) => s + treeSize(ch), 0);
  }

  /* ================================================================
     STRUCTURAL SIMILARITY   (core algorithm)
     ================================================================ */

  /* Weight table — reduced weights for composite operators so
     children (bounds, arguments, denominators) dominate the score.
     A matching INT node alone should NOT produce a high score;
     the children must also match. */
  const W = {
    int: 1.0, sum: 1.0, prod: 1.0, lim: 1.0,
    frac: 1.0, sqrt: 1.0, binom: 1.0,
    fn: 1.5, pow: 1.2, idx: 1.0,
    sym: 1.2, var: 1.0, num: 1.0,
    op: 0.6, diff: 0.5,
    grp: 0.2, expr: 0.1, other: 0.2, empty: 0,
  };

  function weight(node) {
    return W[node.t] || 1;
  }

  /**
   * Node-level similarity  (0 – 1)
   * Same type + same value = 1
   * Same type, different value = reduced partial credit
   *
   * Tuned to strongly penalise value differences — different
   * functions (cos vs sin), different symbols (infty vs pi),
   * and different numbers should score low.
   */
  function nodeSim(a, b) {
    if (a.t === b.t && a.v === b.v) return 1.0;
    if (a.t === b.t) {
      // Same-type but different-value: LOW partial credit
      if (a.t === 'fn')  return 0.15;   // cos ≠ sin
      if (a.t === 'sym') return 0.10;   // infty ≠ pi
      if (a.t === 'num') return 0.10;   // 0 ≠ 2
      if (a.t === 'var') return 0.15;   // x ≠ y
      if (a.t === 'op')  return 0.20;   // + ≠ *
      // structural nodes with same type, fallback
      return 0.5;
    }
    // near-miss across types
    if ((a.t === 'var' && b.t === 'sym') || (a.t === 'sym' && b.t === 'var')) return 0.05;
    return 0;
  }

  /**
   * Full tree similarity  (recursive, memoised)
   *
   * sim(A, B) =
   *     nodeSim(A,B) * weight(A)
   *   + bestChildAlignment(A.children, B.children)
   *   ─────────────────────────────────────────────
   *     weight(A) + max(|A.children|, |B.children|)
   */
  function treeSim(a, b, memo) {
    if (!a || !b) return 0;
    if (a.t === 'empty' || b.t === 'empty') return 0;

    const ka = nodeKey(a), kb = nodeKey(b);
    const mk = ka + '|' + kb;
    if (memo.has(mk)) return memo.get(mk);

    const ns = nodeSim(a, b);
    let score;

    if (a.c.length === 0 && b.c.length === 0) {
      score = ns;
    } else if (ns === 0) {
      score = 0;
    } else {
      const childScore = alignChildren(a.c, b.c, memo);
      const maxCh = Math.max(a.c.length, b.c.length);
      score = (ns * weight(a) + childScore) / (weight(a) + maxCh);

      // Size-mismatch penalty: penalise when subtree sizes differ.
      // A formula with 5 nodes vs 12 nodes shouldn't score high.
      const sA = treeSize(a), sB = treeSize(b);
      const sizeRatio = Math.min(sA, sB) / Math.max(sA, sB);
      // Cube-root penalty: harsher than sqrt for big differences
      score *= Math.pow(sizeRatio, 0.7);
    }

    memo.set(mk, score);
    return score;
  }

  /* ── light-weight structural key per node ── */
  let _kid = 0;
  const _kmap = new WeakMap();
  function nodeKey(n) {
    if (_kmap.has(n)) return _kmap.get(n);
    const k = ++_kid;
    _kmap.set(n, k);
    return k;
  }

  /**
   * Greedy bipartite alignment of two child arrays.
   * O(n*m) with n,m typically ≤ 6.
   */
  function alignChildren(ac, bc, memo) {
    if (!ac.length || !bc.length) return 0;

    // build score matrix
    const mat = ac.map(a => bc.map(b => treeSim(a, b, memo)));

    let total = 0;
    const usedJ = new Set();
    const pairs = Math.min(ac.length, bc.length);

    for (let p = 0; p < pairs; p++) {
      let bestI = -1, bestJ = -1, bestS = -1;
      for (let i = 0; i < ac.length; i++) {
        for (let j = 0; j < bc.length; j++) {
          if (usedJ.has(j)) continue;
          if (mat[i][j] > bestS) { bestS = mat[i][j]; bestI = i; bestJ = j; }
        }
      }
      if (bestJ >= 0 && bestS > 0) {
        usedJ.add(bestJ);
        mat[bestI] = mat[bestI].map(() => -1);     // mark row used
        total += bestS;
      }
    }
    return total;
  }

  /* ================================================================
     MAXIMUM SUBTREE SIMILARITY
     ================================================================
     For a query tree Q and a target tree T, find the subtree of T
     that is most similar to Q.  This handles the case where the
     searched formula is embedded inside a larger expression.
   */
  function maxSubtreeSim(query, target) {
    if (!query || !target) return 0;

    const memo = new Map();

    function walk(t) {
      let best = treeSim(query, t, memo);
      for (const ch of t.c) {
        const s = walk(ch);
        if (s > best) best = s;
      }
      return best;
    }

    return Math.min(walk(target), 1);
  }

  /* ================================================================
     FORMULA EXTRACTION FROM HTML / PLAIN TEXT
     ================================================================ */

  /**
   * Pull LaTeX strings out of HTML that may contain
   * $…$  $$…$$  \(…\)  \[…\]  delimiters.
   */
  function extractFormulas(text) {
    if (!text) return [];

    // decode HTML entities & strip tags
    const d = text
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/<[^>]+>/g, ' ');

    const out = new Set();
    let m;

    // $$…$$
    const re1 = /\$\$([^$]{2,}?)\$\$/g;
    while ((m = re1.exec(d)) !== null) out.add(m[1].trim());

    // $…$   (not $$)
    const re2 = /(?<!\$)\$(?!\$)([^$]{2,}?)\$(?!\$)/g;
    while ((m = re2.exec(d)) !== null) out.add(m[1].trim());

    // \(…\)
    const re3 = /\\\((.+?)\\\)/gs;
    while ((m = re3.exec(d)) !== null) out.add(m[1].trim());

    // \[…\]
    const re4 = /\\\[(.+?)\\\]/gs;
    while ((m = re4.exec(d)) !== null) out.add(m[1].trim());

    // Heuristic: if nothing found, look for raw LaTeX command patterns
    if (out.size === 0) {
      const re5 = /(\\(?:frac|int|sum|prod|lim|sqrt|binom)\s*(?:\{[^}]*\}\s*){1,3})/g;
      while ((m = re5.exec(d)) !== null) out.add(m[1].trim());

      const re6 = /(\\(?:cos|sin|tan|ln|log|exp)\s*[\({][^)\}]*[\)}])/g;
      while ((m = re6.exec(d)) !== null) out.add(m[1].trim());
    }

    return [...out].filter(f => f.length > 2);
  }

  /* ================================================================
     RESULT SCORER
     ================================================================ */

  /**
   * Score a single search result against the query formula.
   *
   * Uses multi-signal approach (ARQMath-inspired):
   *   - MathWebSearch tree similarity
   *   - Tangent-S symbol pair similarity (if FormulaTokenizer loaded)
   *   - OPT path similarity (if FormulaTokenizer loaded)
   *   - Answer body formula extraction (new: scans answers too)
   *
   * @param {object}  queryTree — pre-parsed query AST
   * @param {string}  title     — question title (often has LaTeX in $…$)
   * @param {string}  excerpt   — search excerpt
   * @param {string}  body      — (optional) full body HTML
   * @param {Array}   answers   — (optional) array of answer objects with body
   * @returns {number} 0 – 1  similarity score
   */
  function scoreResult(queryTree, title, excerpt, body, answers) {
    // Collect text from title, excerpt, body AND answer bodies
    const textParts = [title, excerpt, body].filter(Boolean);
    if (answers && Array.isArray(answers)) {
      for (const ans of answers) {
        if (ans && ans.body) textParts.push(ans.body);
      }
    }
    const text = textParts.join(' ');
    const formulas = extractFormulas(text);
    if (!formulas.length) return 0;

    const useTokenizer = typeof FormulaTokenizer !== 'undefined';

    let best = 0;
    for (const f of formulas) {
      try {
        // Canonicalize if available
        const canonF = typeof LaTeXCanon !== 'undefined' ? LaTeXCanon.canonicalize(f) : f;
        const tree = parse(canonF);
        if (!tree || tree.t === 'empty') continue;

        let s;
        if (useTokenizer) {
          // ARQMath combined scoring
          s = FormulaTokenizer.combinedSimilarity(queryTree, tree);
        } else {
          s = maxSubtreeSim(queryTree, tree);
        }

        if (s > best) best = s;
        if (best > 0.95) break;          // early exit on near-exact match
      } catch (_) { /* skip bad formulas */ }
    }
    return best;
  }

  /* ================================================================
     BATCH RE-RANKER
     ================================================================ */

  /**
   * Score every result and re-sort by structural similarity.
   *
   * @param {string} queryTex — raw LaTeX query
   * @param {Array}  items    — search result items
   * @returns {Array} items sorted by similarity (desc), with _similarity field
   */
  function rankResults(queryTex, items) {
    if (!queryTex || !items.length) return items;

    // Canonicalize query before parsing
    const canonQuery = typeof LaTeXCanon !== 'undefined'
      ? LaTeXCanon.canonicalize(queryTex) : queryTex;
    const queryTree = parse(canonQuery);
    if (!queryTree || queryTree.t === 'empty') return items;

    const scored = items.map(item => {
      const sim = scoreResult(
        queryTree,
        item.title  || '',
        item.excerpt || '',
        item.body   || '',
        item.answers || []       // Pass answers for formula extraction
      );
      return { ...item, _similarity: sim };
    });

    // Strict sort: similarity (desc), then SE score as tie-break
    scored.sort((a, b) => {
      const d = b._similarity - a._similarity;
      if (d !== 0) return d;
      return (b.score || 0) - (a.score || 0);
    });

    return scored;
  }

  /* ── public API ── */
  return {
    parse,
    treeSize,
    treeSim,
    maxSubtreeSim,
    extractFormulas,
    scoreResult,
    rankResults,
  };

})();
