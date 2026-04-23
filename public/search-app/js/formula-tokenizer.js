/* ================================================================
   formula-tokenizer.js — Tangent-S Inspired Formula Tokenization
   ================================================================
   Based on approaches from the ARQMath Lab (CLEF 2020-2022),
   especially the Tangent-S system and BM25 on Operator Tree Path
   Tokens (Approach Zero + Anserini, CLEF 2021).

   Techniques implemented:
     1. Symbol Pair Extraction (Tangent-S style)
        - Parent-child pairs from the AST
        - Left-sibling pairs
        - Each pair includes relative position info
     2. LaTeX N-gram Tokenization
        - Overlapping n-grams of LaTeX tokens for fuzzy matching
     3. OPT Path Tokens (simplified)
        - Root-to-leaf paths in the expression tree
     4. TF-IDF Scoring
        - Weight tokens by inverse document frequency heuristic
     5. Structural Fingerprinting
        - Hash formula shape for fast duplicate detection

   These tokenizations enable:
     - More granular formula matching
     - Partial structure matching (subexpression retrieval)
     - Weighted scoring using term importance
   ================================================================ */

const FormulaTokenizer = (() => {

  /* ================================================================
     1. SYMBOL PAIR EXTRACTION (Tangent-S inspired)
     ================================================================
     From the AST, extract pairs: (parent_symbol, child_symbol, relation)
     Relations: 'c' (child), 's' (sibling), 'n' (next)
     Position info: index of child in parent's children array

     Example:  \frac{\cos x}{1+x^2}  →
       [frac,cos,c0]  [frac,+,c1]  [cos,x,c0]  [+,1,c0]  [+,pow,c1]  ...
   ================================================================ */

  function extractSymbolPairs(tree, maxDepth = 8) {
    const pairs = [];

    function walk(node, depth) {
      if (!node || depth > maxDepth) return;
      const pSym = nodeSymbol(node);

      // Parent → child pairs
      for (let i = 0; i < node.c.length; i++) {
        const child = node.c[i];
        const cSym = nodeSymbol(child);
        pairs.push(`${pSym},${cSym},c${i}`);

        // Sibling pairs (within same parent)
        if (i > 0) {
          const prevSym = nodeSymbol(node.c[i - 1]);
          pairs.push(`${prevSym},${cSym},s${i}`);
        }
      }

      // Recurse
      for (const child of node.c) {
        walk(child, depth + 1);
      }
    }

    walk(tree, 0);
    return pairs;
  }

  /* Compact symbol name for a node */
  function nodeSymbol(node) {
    if (!node) return '?';
    switch (node.t) {
      case 'fn':   return `F:${node.v}`;
      case 'var':  return `V:${node.v}`;
      case 'num':  return `N:${node.v}`;
      case 'sym':  return `S:${node.v}`;
      case 'op':   return `O:${node.v}`;
      case 'frac': return 'FRAC';
      case 'int':  return 'INT';
      case 'sum':  return 'SUM';
      case 'prod': return 'PROD';
      case 'lim':  return 'LIM';
      case 'sqrt': return 'SQRT';
      case 'pow':  return 'POW';
      case 'idx':  return 'IDX';
      case 'diff': return `D:${node.v}`;
      case 'binom':return 'BINOM';
      case 'grp':  return 'GRP';
      case 'expr': return 'EXPR';
      default:     return node.t.toUpperCase();
    }
  }

  /* ================================================================
     2. OPT PATH TOKENS (simplified Operator Tree Paths)
     ================================================================
     Extract root-to-leaf paths in the expression tree.
     Each path is a string of node types separated by '/'.

     Example: \int_0^\infty \frac{\cos x}{1+x^2} dx
       INT/lo/num:0
       INT/hi/sym:infty
       INT/FRAC/fn:cos/var:x
       INT/FRAC/op:+/num:1/POW/var:x/num:2
   ================================================================ */

  function extractPathTokens(tree, maxDepth = 6) {
    const paths = [];

    function walk(node, path, depth) {
      if (!node || depth > maxDepth) return;

      const sym = nodeSymbol(node);
      const currentPath = path ? path + '/' + sym : sym;

      // If leaf node, record the path
      if (node.c.length === 0) {
        paths.push(currentPath);
      } else {
        // Continue recursion
        for (const child of node.c) {
          walk(child, currentPath, depth + 1);
        }
      }
    }

    walk(tree, '', 0);
    return paths;
  }

  /* ================================================================
     3. LATEX N-GRAM TOKENIZATION
     ================================================================
     Break LaTeX into overlapping token n-grams for fuzzy text matching.
     Uses the MathSimilarity tokenizer to first get atomic tokens,
     then builds bigrams and trigrams.
   ================================================================ */

  function tokenizeLatex(tex) {
    // Atomic LaTeX tokens
    const atoms = [];
    let i = 0;
    while (i < tex.length) {
      // Skip whitespace
      if (/\s/.test(tex[i])) { i++; continue; }

      // LaTeX command
      if (tex[i] === '\\') {
        let cmd = '\\';
        i++;
        if (i < tex.length && /[a-zA-Z]/.test(tex[i])) {
          while (i < tex.length && /[a-zA-Z]/.test(tex[i])) cmd += tex[i++];
        } else if (i < tex.length) {
          cmd += tex[i++];
        }
        atoms.push(cmd);
        continue;
      }

      // Number
      if (/\d/.test(tex[i])) {
        let num = '';
        while (i < tex.length && /[\d.]/.test(tex[i])) num += tex[i++];
        atoms.push(num);
        continue;
      }

      // Single character
      atoms.push(tex[i]);
      i++;
    }
    return atoms;
  }

  function buildNgrams(atoms, n) {
    const grams = [];
    for (let i = 0; i <= atoms.length - n; i++) {
      grams.push(atoms.slice(i, i + n).join(' '));
    }
    return grams;
  }

  function latexNgrams(tex, maxN = 3) {
    const atoms = tokenizeLatex(tex);
    const all = [];
    for (let n = 1; n <= Math.min(maxN, atoms.length); n++) {
      all.push(...buildNgrams(atoms, n));
    }
    return all;
  }

  /* ================================================================
     4. TF-IDF SCORING (heuristic)
     ================================================================
     Since we don't have a full corpus, we use a heuristic IDF
     based on how "common" a formula token is likely to be on MSE.

     Rare tokens (specific variable names, unusual structures)
     get high weight. Common tokens (x, +, {, }) get low weight.
   ================================================================ */

  const IDF_TABLE = {
    // Very common — low weight
    'V:x': 0.3, 'V:y': 0.35, 'V:n': 0.35, 'V:i': 0.4,
    'V:k': 0.4, 'V:a': 0.4, 'V:b': 0.4, 'V:t': 0.45,
    'N:0': 0.3, 'N:1': 0.35, 'N:2': 0.4, 'N:3': 0.5,
    'O:+': 0.2, 'O:-': 0.25, 'O:*': 0.3, 'O:/': 0.3,
    'O:=': 0.2, 'O:,': 0.15,
    'GRP': 0.1, 'EXPR': 0.1,

    // Structural — medium weight
    'FRAC': 1.2, 'POW': 0.8, 'IDX': 0.7,
    'SQRT': 1.3, 'BINOM': 1.5,

    // Operators — high weight
    'INT': 2.0, 'SUM': 1.8, 'PROD': 1.8, 'LIM': 1.7,

    // Functions — high weight
    'F:cos': 1.5, 'F:sin': 1.5, 'F:tan': 1.5,
    'F:sec': 1.7, 'F:csc': 1.7, 'F:cot': 1.7,
    'F:ln': 1.4, 'F:log': 1.4, 'F:exp': 1.5,
    'F:arcsin': 1.8, 'F:arccos': 1.8, 'F:arctan': 1.8,
    'F:sinh': 1.7, 'F:cosh': 1.7, 'F:tanh': 1.7,

    // Symbols — medium-high weight
    'S:infty': 1.2, 'S:pi': 1.1, 'S:alpha': 1.3,
    'S:beta': 1.3, 'S:gamma': 1.3, 'S:theta': 1.3,
    'S:lambda': 1.3, 'S:epsilon': 1.4, 'S:delta': 1.3,
    'S:sigma': 1.3, 'S:phi': 1.3, 'S:omega': 1.3,
    'S:nabla': 1.8, 'S:partial': 1.5,
    'S:forall': 1.4, 'S:exists': 1.4,

    // Differentials — medium
    'D:dx': 0.9, 'D:dy': 0.9, 'D:dt': 0.9,
  };

  function tokenIdf(token) {
    // Check exact match
    if (IDF_TABLE[token] !== undefined) return IDF_TABLE[token];

    // Check prefix match
    const prefix = token.split(':')[0];
    if (prefix === 'F') return 1.5;    // unknown function → high
    if (prefix === 'S') return 1.3;    // unknown symbol → medium-high
    if (prefix === 'V') return 0.5;    // unknown variable → low
    if (prefix === 'N') return 0.5;    // unknown number → low
    if (prefix === 'O') return 0.3;    // unknown operator → low

    return 0.8;   // default
  }

  /* ================================================================
     5. WEIGHTED PAIR SIMILARITY
     ================================================================
     Compare two formulas using their symbol pair sets,
     weighted by TF-IDF.

     score = sum( IDF(pair) for pair in intersection )
             / sum( IDF(pair) for pair in union )
   ================================================================ */

  function weightedPairSimilarity(pairsA, pairsB) {
    if (!pairsA.length && !pairsB.length) return 1;
    if (!pairsA.length || !pairsB.length) return 0;

    const setA = new Map();
    const setB = new Map();

    for (const p of pairsA) setA.set(p, (setA.get(p) || 0) + 1);
    for (const p of pairsB) setB.set(p, (setB.get(p) || 0) + 1);

    const allKeys = new Set([...setA.keys(), ...setB.keys()]);

    let intersectScore = 0;
    let unionScore = 0;

    for (const key of allKeys) {
      const countA = setA.get(key) || 0;
      const countB = setB.get(key) || 0;
      // Extract parent symbol for IDF weighting
      const sym = key.split(',')[0];
      const w = tokenIdf(sym);

      const minCount = Math.min(countA, countB);
      const maxCount = Math.max(countA, countB);

      intersectScore += minCount * w;
      unionScore += maxCount * w;
    }

    return unionScore > 0 ? intersectScore / unionScore : 0;
  }

  /* ================================================================
     6. PATH TOKEN SIMILARITY
     ================================================================
     Compare path token sets using Jaccard-like similarity
     with partial path matching for prefix matches.
   ================================================================ */

  function pathSimilarity(pathsA, pathsB) {
    if (!pathsA.length && !pathsB.length) return 1;
    if (!pathsA.length || !pathsB.length) return 0;

    let matches = 0;
    const used = new Set();

    for (const pa of pathsA) {
      let bestMatch = 0;
      let bestIdx = -1;

      for (let j = 0; j < pathsB.length; j++) {
        if (used.has(j)) continue;
        const pb = pathsB[j];

        if (pa === pb) {
          // Exact match
          if (1.0 > bestMatch) { bestMatch = 1.0; bestIdx = j; }
        } else if (pa.startsWith(pb + '/') || pb.startsWith(pa + '/')) {
          // Prefix match — partial credit
          const shorter = Math.min(pa.length, pb.length);
          const longer = Math.max(pa.length, pb.length);
          const partial = shorter / longer * 0.7;
          if (partial > bestMatch) { bestMatch = partial; bestIdx = j; }
        }
      }

      if (bestIdx >= 0 && bestMatch > 0) {
        used.add(bestIdx);
        matches += bestMatch;
      }
    }

    return matches / Math.max(pathsA.length, pathsB.length);
  }

  /* ================================================================
     7. STRUCTURAL FINGERPRINT
     ================================================================
     Encodes the "shape" of a formula tree as a compact string.
     Used for fast pre-filtering (formulas with different shapes
     cannot be structurally identical).

     Example: \frac{\cos x}{1+x^2} → "FRAC(fn(V),O(N,POW(V,N)))"
   ================================================================ */

  function structuralFingerprint(tree, maxDepth = 5) {
    if (!tree) return '';

    function buildFP(node, depth) {
      if (!node || depth > maxDepth) return '*';
      const sym = nodeSymbol(node);
      if (node.c.length === 0) return sym;
      const childFPs = node.c.map(c => buildFP(c, depth + 1)).join(',');
      return `${sym}(${childFPs})`;
    }

    return buildFP(tree, 0);
  }

  /* ================================================================
     8. COMBINED SIMILARITY SCORE
     ================================================================
     Combines multiple similarity signals with tuned weights.
     Designed to strongly penalise formulas that share surface
     structure but differ in actual mathematical content (bounds,
     denominators, functions, etc.).

     Signals:
       - Tree similarity  (MathWebSearch-style):  25%
       - Symbol pairs  (Tangent-S style):         25%
       - Path tokens  (OPT-style):                20%
       - Leaf content overlap:                     20%
       - Fingerprint match bonus:                  10%
   ================================================================ */

  /** Collect ALL leaf values from an AST */
  function collectLeaves(tree) {
    const leaves = [];
    function walk(node) {
      if (!node) return;
      if (node.c.length === 0) {
        const sym = nodeSymbol(node);
        leaves.push(sym);
      }
      for (const ch of node.c) walk(ch);
    }
    walk(tree);
    return leaves;
  }

  /** Weighted Jaccard over leaf multisets, using IDF weights */
  function leafContentSimilarity(queryTree, candidateTree) {
    const qLeaves = collectLeaves(queryTree);
    const cLeaves = collectLeaves(candidateTree);
    if (!qLeaves.length && !cLeaves.length) return 1;
    if (!qLeaves.length || !cLeaves.length) return 0;

    const qMap = new Map();
    const cMap = new Map();
    for (const l of qLeaves) qMap.set(l, (qMap.get(l) || 0) + 1);
    for (const l of cLeaves) cMap.set(l, (cMap.get(l) || 0) + 1);

    const allKeys = new Set([...qMap.keys(), ...cMap.keys()]);
    let intersect = 0, union = 0;
    for (const key of allKeys) {
      const qc = qMap.get(key) || 0;
      const cc = cMap.get(key) || 0;
      // Square the IDF weight to amplify distinctive tokens
      // (functions, symbols ≫ common variables/operators)
      const w = tokenIdf(key) ** 2;
      intersect += Math.min(qc, cc) * w;
      union += Math.max(qc, cc) * w;
    }
    return union > 0 ? intersect / union : 0;
  }

  /**
   * Distinctive Content Match — compares only high-IDF (≥0.9) tokens.
   * Filters out common variables (x,y,n), numbers (0,1,2), trivial
   * operators (+,-,=). What remains are the mathematically distinctive
   * tokens: specific functions (cos, sin, ln), symbols (∞, π, α),
   * and structural operators (INT, FRAC, SUM).
   *
   * This signal strongly penalises formulas that share structure but
   * differ in their mathematically meaningful content.
   */
  function distinctiveContentMatch(queryTree, candidateTree) {
    const qLeaves = collectLeaves(queryTree);
    const cLeaves = collectLeaves(candidateTree);

    // Filter to distinctive tokens only
    const idfThreshold = 0.9;
    const qDist = qLeaves.filter(l => tokenIdf(l) >= idfThreshold);
    const cDist = cLeaves.filter(l => tokenIdf(l) >= idfThreshold);

    if (!qDist.length && !cDist.length) return 1;
    if (!qDist.length || !cDist.length) return 0;

    const qMap = new Map();
    const cMap = new Map();
    for (const l of qDist) qMap.set(l, (qMap.get(l) || 0) + 1);
    for (const l of cDist) cMap.set(l, (cMap.get(l) || 0) + 1);

    const allKeys = new Set([...qMap.keys(), ...cMap.keys()]);
    let intersect = 0, union = 0;
    for (const key of allKeys) {
      const qc = qMap.get(key) || 0;
      const cc = cMap.get(key) || 0;
      const w = tokenIdf(key);
      intersect += Math.min(qc, cc) * w;
      union += Math.max(qc, cc) * w;
    }
    return union > 0 ? intersect / union : 0;
  }

  function combinedSimilarity(queryTree, candidateTree) {
    if (!queryTree || !candidateTree) return 0;

    // Tree similarity (from MathSimilarity module)
    const treeSim = MathSimilarity.maxSubtreeSim(queryTree, candidateTree);

    // Symbol pair similarity
    const queryPairs = extractSymbolPairs(queryTree);
    const candPairs = extractSymbolPairs(candidateTree);
    const pairSim = weightedPairSimilarity(queryPairs, candPairs);

    // Path token similarity
    const queryPaths = extractPathTokens(queryTree);
    const candPaths = extractPathTokens(candidateTree);
    const pathSim = pathSimilarity(queryPaths, candPaths);

    // Leaf content overlap (all tokens, squared IDF)
    const leafSim = leafContentSimilarity(queryTree, candidateTree);

    // Distinctive content (high-IDF tokens only) — most discriminative
    const distSim = distinctiveContentMatch(queryTree, candidateTree);

    // Structural fingerprint bonus
    const qfp = structuralFingerprint(queryTree, 3);
    const cfp = structuralFingerprint(candidateTree, 3);
    const fpBonus = (qfp === cfp) ? 1.0 : 0;

    // Weighted combination — distinctive content and fingerprint are
    // the strongest discriminators between "same shape, different math"
    const combined = (
      0.10 * treeSim +
      0.10 * pairSim +
      0.10 * pathSim +
      0.15 * leafSim +
      0.35 * distSim +
      0.20 * fpBonus
    );

    return Math.min(combined, 1.0);
  }

  /* ================================================================
     9. SEARCH QUERY ENHANCEMENT
     ================================================================
     Generate enhanced search queries using tokenization insights.
   ================================================================ */

  /**
   * Build "important tokens" query string.
   * Extracts the most distinctive tokens from a formula
   * (high-IDF terms) for use in text search.
   */
  function buildImportantTokensQuery(tree) {
    const pairs = extractSymbolPairs(tree);
    const paths = extractPathTokens(tree);

    // Collect unique symbols from pairs with high IDF
    const symbols = new Map();
    for (const pair of pairs) {
      const parts = pair.split(',');
      for (const sym of [parts[0], parts[1]]) {
        const idf = tokenIdf(sym);
        if (idf >= 1.0 && !symbols.has(sym)) {
          symbols.set(sym, idf);
        }
      }
    }

    // Convert symbols back to search-friendly text
    const terms = [];
    const sortedSyms = [...symbols.entries()].sort((a, b) => b[1] - a[1]);

    for (const [sym] of sortedSyms.slice(0, 6)) {
      const [prefix, name] = sym.split(':');
      if (!name) {
        // Structural tokens
        const termMap = {
          'INT': 'integral', 'SUM': 'sum', 'PROD': 'product',
          'LIM': 'limit', 'FRAC': 'fraction', 'SQRT': 'square root',
          'BINOM': 'binomial',
        };
        if (termMap[sym]) terms.push(termMap[sym]);
      } else if (prefix === 'F') {
        terms.push(name);
      } else if (prefix === 'S') {
        const symMap = {
          'infty': 'infinity', 'pi': 'pi', 'nabla': 'nabla',
          'partial': 'partial', 'alpha': 'alpha', 'beta': 'beta',
          'gamma': 'gamma', 'theta': 'theta', 'lambda': 'lambda',
        };
        terms.push(symMap[name] || name);
      }
    }

    return terms.join(' ');
  }

  /**
   * Generate subexpression queries from AST subtrees.
   * Each subtree of sufficient size yields a potential search query.
   */
  function extractSubexprQueries(tree, minSize = 3) {
    const queries = [];

    function walk(node) {
      if (!node) return;
      const size = MathSimilarity.treeSize(node);
      if (size >= minSize && node.t !== 'expr' && node.t !== 'grp') {
        const fp = structuralFingerprint(node, 3);
        const tokens = buildImportantTokensQuery(node);
        if (tokens.length > 3) {
          queries.push({
            fingerprint: fp,
            query: tokens,
            size: size,
          });
        }
      }
      for (const child of node.c) walk(child);
    }

    walk(tree);

    // Deduplicate by fingerprint and sort by subtree size (largest first)
    const seen = new Set();
    return queries
      .filter(q => {
        if (seen.has(q.fingerprint)) return false;
        seen.add(q.fingerprint);
        return true;
      })
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);
  }

  /* ── public API ── */
  return {
    extractSymbolPairs,
    extractPathTokens,
    tokenizeLatex,
    latexNgrams,
    tokenIdf,
    weightedPairSimilarity,
    pathSimilarity,
    structuralFingerprint,
    collectLeaves,
    leafContentSimilarity,
    distinctiveContentMatch,
    combinedSimilarity,
    buildImportantTokensQuery,
    extractSubexprQueries,
    nodeSymbol,
  };

})();
