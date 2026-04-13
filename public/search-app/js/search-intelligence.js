/* ================================================================
   search-intelligence.js — Intelligent Search Techniques
   ================================================================
   Advanced heuristic search strategies:

   1.  Intent Detection        — classify query as proof/compute/define/example/solve
   2.  Semantic Query Rewriting — rewrite query using detected intent
   3.  Adaptive Recall          — dynamically broaden when results are sparse
   4.  Query Fingerprinting     — fast duplicate/near-duplicate detection
   5.  Smart Snippet Extraction — find most relevant passage in bodies
   6.  TF-IDF Rare Term Boost  — weight uncommon math terms higher
   7.  Cross-Concept Bridge     — discover connections between topics
   8.  Answer Quality Scoring   — deep answer quality analysis
   9.  Confidence Estimation    — how confident we are in result relevance
   10. Query Suggestion Engine  — "Related searches" from query analysis
   ================================================================ */

const SearchIntelligence = (() => {
  'use strict';

  /* ════════════════════════════════════════════════════════════════
     1. INTENT DETECTION
     Classifies the user's query into one or more mathematical intents.
     This shapes how we search, rank, and present results.
     ════════════════════════════════════════════════════════════════ */

  const INTENT_PATTERNS = {
    prove: {
      weight: 1.0,
      triggers: [
        /\b(prove|proof|show\s+that|demonstrate|establish|verify|confirm)\b/i,
        /\b(by\s+induction|by\s+contradiction|by\s+contrapositive)\b/i,
        /\b(if\s+and\s+only\s+if|iff|implies|therefore|QED)\b/i,
        /\b(lemma|theorem|proposition|corollary)\b/i,
      ],
      boostTags: ['proof-writing', 'proof-verification', 'induction', 'logic'],
      queryPrefix: 'prove',
    },
    compute: {
      weight: 1.0,
      triggers: [
        /\b(compute|calculate|evaluate|find\s+the\s+value|what\s+is)\b/i,
        /\b(simplify|reduce|expand|factor)\b/i,
        /\b(solve\s+for|result\s+of|answer\s+to)\b/i,
        /=\s*\?|\?\s*=/,
      ],
      boostTags: ['calculus', 'algebra-precalculus', 'arithmetic'],
      queryPrefix: 'compute',
    },
    define: {
      weight: 0.9,
      triggers: [
        /\b(what\s+is\s+a?|define|definition\s+of|meaning\s+of)\b/i,
        /\b(explain|describe|what\s+does.*mean|concept\s+of)\b/i,
        /\b(intuition|intuitive|intuitively|geometric\s+interpretation)\b/i,
      ],
      boostTags: ['definition', 'terminology', 'soft-question'],
      queryPrefix: 'definition',
    },
    example: {
      weight: 0.8,
      triggers: [
        /\b(example|examples|instance|counter\s*example|illustration)\b/i,
        /\b(for\s+example|such\s+as|like|e\.g\.|give\s+(an?\s+)?example)\b/i,
        /\b(construct|exhibit|produce|find\s+an?\s+example)\b/i,
      ],
      boostTags: ['examples-counterexamples'],
      queryPrefix: 'example',
    },
    solve: {
      weight: 1.0,
      triggers: [
        /\b(solve|solution|solving|how\s+to\s+solve|find\s+(all|the)\b)/i,
        /\b(roots?\s+of|zeros?\s+of|where\s+does)\b/i,
        /\b(equation|system\s+of|satisf(y|ies))\b/i,
      ],
      boostTags: ['solving-equations', 'systems-of-equations'],
      queryPrefix: 'solve',
    },
    visualize: {
      weight: 0.7,
      triggers: [
        /\b(graph|plot|draw|sketch|visualize|diagram|picture|figure)\b/i,
        /\b(what\s+does.*look\s+like|shape\s+of|geometric(ally)?)\b/i,
      ],
      boostTags: ['graphing-functions', 'geometry', 'visualization'],
      queryPrefix: 'graph',
    },
    compare: {
      weight: 0.8,
      triggers: [
        /\b(difference\s+between|compare|vs\.?|versus|distinction)\b/i,
        /\b(relationship\s+between|how\s+.*relate|connection\s+between)\b/i,
        /\b(similar\s+to|analogous|analogy|equivalent\s+to)\b/i,
      ],
      boostTags: ['terminology', 'soft-question'],
      queryPrefix: 'difference',
    },
    why: {
      weight: 0.9,
      triggers: [
        /\b(why\s+(is|does|do|are|can|should)|reason\s+for|motivation)\b/i,
        /\b(how\s+come|what\s+makes|behind\s+the|underlying)\b/i,
        /\b(intuition|insight|idea\s+behind|philosophy)\b/i,
      ],
      boostTags: ['intuition', 'motivation', 'soft-question'],
      queryPrefix: 'why',
    },
  };

  /**
   * Detect user intent from a search query.
   * Returns an array of { intent, confidence, boostTags } sorted by confidence.
   */
  function detectIntent(query) {
    if (!query) return [];

    const results = [];

    for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
      let matchCount = 0;
      for (const re of config.triggers) {
        if (re.test(query)) matchCount++;
      }
      if (matchCount > 0) {
        const confidence = Math.min(matchCount / config.triggers.length * config.weight * 1.5, 1.0);
        results.push({
          intent,
          confidence: Math.round(confidence * 100) / 100,
          boostTags: config.boostTags,
          queryPrefix: config.queryPrefix,
        });
      }
    }

    // Sort by confidence desc
    results.sort((a, b) => b.confidence - a.confidence);

    // If no intent detected, default to generic "solve/compute"
    if (results.length === 0) {
      results.push({ intent: 'generic', confidence: 0.3, boostTags: [], queryPrefix: '' });
    }

    return results;
  }

  /* ════════════════════════════════════════════════════════════════
     2. SEMANTIC QUERY REWRITING
     Rewrites the query to better capture the user's intent.
     Generates multiple search variants from a single query.
     ════════════════════════════════════════════════════════════════ */

  const REWRITE_RULES = [
    // "How to X" → "X method technique"
    { match: /^how\s+to\s+(.+)/i, rewrite: (m) => [`${m[1]} method`, `${m[1]} technique`] },
    // "Why is X Y" → "proof X Y", "explanation X Y"
    { match: /^why\s+(is|does|do|are)\s+(.+)/i, rewrite: (m) => [`proof ${m[2]}`, `explanation ${m[2]}`] },
    // "What is X" → "definition X", "X explained"
    { match: /^what\s+is\s+(a\s+)?(.+)/i, rewrite: (m) => [`definition ${m[2]}`, `${m[2]} explained`] },
    // "Difference between X and Y" → "X vs Y", "X compared to Y"
    { match: /difference\s+between\s+(.+?)\s+and\s+(.+)/i, rewrite: (m) => [`${m[1]} vs ${m[2]}`, `${m[1]} compared ${m[2]}`] },
    // "Prove that X" → "proof X", "show X"  
    { match: /^prove\s+(?:that\s+)?(.+)/i, rewrite: (m) => [`proof ${m[1]}`, `show ${m[1]}`] },
    // "Solve X" → "solution X", "solving X"
    { match: /^solve\s+(.+)/i, rewrite: (m) => [`solution ${m[1]}`, `solving ${m[1]}`] },
    // "Example of X" → "X example", "X counterexample"
    { match: /example\s+of\s+(.+)/i, rewrite: (m) => [`${m[1]} example`, `${m[1]} counterexample`] },
    // "Find X" → "compute X", "determine X"
    { match: /^find\s+(.+)/i, rewrite: (m) => [`compute ${m[1]}`, `determine ${m[1]}`] },
    // "Is X true" → "proof X", "X is true when"
    { match: /^is\s+(.+?)\s*(\?|true|correct|valid)/i, rewrite: (m) => [`proof ${m[1]}`, `${m[1]} conditions`] },
  ];

  /**
   * Rewrite a query into multiple semantic variants.
   * Returns: { variants: string[], intent: string }
   */
  function rewriteQuery(query) {
    const variants = [];
    let matched = false;

    for (const rule of REWRITE_RULES) {
      const m = query.match(rule.match);
      if (m) {
        variants.push(...rule.rewrite(m));
        matched = true;
        break; // Apply only the first matching rule
      }
    }

    // If no rule matched, try permuting key terms
    if (!matched) {
      const words = query.split(/\s+/).filter(w => w.length > 2);
      if (words.length >= 3) {
        // Swap first two content words
        const arr = [...words];
        [arr[0], arr[1]] = [arr[1], arr[0]];
        variants.push(arr.join(' '));
      }
    }

    return { variants: [...new Set(variants)].slice(0, 2) };
  }

  /* ════════════════════════════════════════════════════════════════
     3. ADAPTIVE RECALL EXPANSION
     When initial search returns too few results, progressively
     broaden the search using multiple fallback strategies.
     ════════════════════════════════════════════════════════════════ */

  /**
   * Generate fallback queries for sparse results.
   * Level 0: Original query (already done)
   * Level 1: Remove qualifiers ("of the", "for all", prepositions)
   * Level 2: Extract only math-significant words
   * Level 3: Use only inferred tags as query
   */
  function generateFallbacks(query, level) {
    const fallbacks = [];

    if (level >= 1) {
      // Strip qualifiers and fillers
      const stripped = query
        .replace(/\b(of|the|for|all|any|each|every|some|such|that|this|these|those)\b/gi, ' ')
        .replace(/\b(how|to|do|does|is|are|was|were|can|could|would|should|will|shall)\b/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (stripped && stripped !== query && stripped.length >= 3) {
        fallbacks.push({ q: stripped, label: 'simplified' });
      }
    }

    if (level >= 2) {
      // Extract only math-significant nouns
      const MATH_NOUNS = /\b(integral|derivative|limit|series|matrix|vector|eigenvalue|polynomial|equation|function|theorem|group|ring|field|topology|metric|measure|probability|distribution|convergence|continuity|prime|divisibility|modular|congruence|sequence|sum|product|inequality|norm|basis|kernel|determinant|rank|trace|gradient|divergence|curl|laplacian)\b/gi;
      const nouns = [];
      let m;
      while ((m = MATH_NOUNS.exec(query)) !== null) nouns.push(m[1].toLowerCase());
      if (nouns.length >= 1) {
        fallbacks.push({ q: [...new Set(nouns)].join(' '), label: 'core-terms' });
      }
    }

    if (level >= 3) {
      // Use tag names directly as search query
      if (typeof SearchEnhance !== 'undefined') {
        const tags = SearchEnhance.inferTags(query, 3);
        if (tags.length > 0) {
          fallbacks.push({ q: tags.join(' ').replace(/-/g, ' '), label: 'tag-based' });
        }
      }
    }

    return fallbacks;
  }

  /* ════════════════════════════════════════════════════════════════
     4. QUERY FINGERPRINTING & NEAR-DUPLICATE DETECTION
     Uses title similarity hashing to identify and merge duplicates.
     ════════════════════════════════════════════════════════════════ */

  /** Compute a simple n-gram fingerprint of text */
  function textFingerprint(text, n = 3) {
    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const grams = new Set();
    for (let i = 0; i <= clean.length - n; i++) {
      grams.add(clean.substring(i, i + n));
    }
    return grams;
  }

  /** Jaccard similarity between two fingerprint sets */
  function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 1;
    let intersection = 0;
    for (const g of setA) {
      if (setB.has(g)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Detect near-duplicate results by title similarity.
   * Groups results with >70% title similarity.
   * Returns items with _duplicateOf or _duplicateGroup annotations.
   */
  function detectDuplicates(items, threshold = 0.7) {
    if (items.length < 2) return items;

    // Compute fingerprints
    const fps = items.map(item => ({
      item,
      fp: textFingerprint(item.title || ''),
    }));

    const groups = []; // group index per item
    let nextGroup = 0;
    const groupMap = new Map(); // itemIndex → groupId

    for (let i = 0; i < fps.length; i++) {
      if (groupMap.has(i)) continue;
      const gid = nextGroup++;
      groupMap.set(i, gid);
      const members = [i];

      for (let j = i + 1; j < fps.length; j++) {
        if (groupMap.has(j)) continue;
        const sim = jaccardSimilarity(fps[i].fp, fps[j].fp);
        if (sim >= threshold) {
          groupMap.set(j, gid);
          members.push(j);
        }
      }

      if (members.length > 1) {
        groups.push(members);
      }
    }

    // Annotate items
    for (const group of groups) {
      // Keep the highest-scored item as primary
      group.sort((a, b) => (fps[b].item._relevanceScore || fps[b].item.score || 0) - (fps[a].item._relevanceScore || fps[a].item.score || 0));
      const primaryIdx = group[0];
      fps[primaryIdx].item._duplicateGroup = group.length;
      for (let k = 1; k < group.length; k++) {
        fps[group[k]].item._duplicateOf = fps[primaryIdx].item.question_id;
        fps[group[k]].item._isDuplicate = true;
      }
    }

    // Return with duplicates pushed to end
    const primary = items.filter(i => !i._isDuplicate);
    const dupes = items.filter(i => i._isDuplicate);
    return [...primary, ...dupes];
  }

  /* ════════════════════════════════════════════════════════════════
     5. SMART SNIPPET EXTRACTION
     Finds the most relevant passage in a question/answer body
     relative to the query. Like Google's featured snippets.
     ════════════════════════════════════════════════════════════════ */

  /**
   * Extract the best matching snippet from HTML body text.
   * Returns { snippet: string, score: number, sentenceIdx: number }
   */
  function extractBestSnippet(body, query, maxLen = 250) {
    if (!body || !query) return null;

    // Strip HTML tags, decode entities
    const text = body
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length < 20) return null;

    const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (qWords.length === 0) return null;

    // Split into sentences
    const sentences = text.split(/(?<=[.!?])\s+/);
    let bestScore = 0;
    let bestIdx = 0;

    sentences.forEach((sent, idx) => {
      const lower = sent.toLowerCase();
      let score = 0;

      // Word overlap
      const matchCount = qWords.filter(w => lower.includes(w)).length;
      score += (matchCount / qWords.length) * 10;

      // Consecutive word bonus
      for (let i = 0; i < qWords.length - 1; i++) {
        if (lower.includes(qWords[i] + ' ' + qWords[i + 1])) score += 3;
      }

      // Length preference (not too short, not too long)
      const wordCount = sent.split(/\s+/).length;
      if (wordCount >= 8 && wordCount <= 40) score += 2;
      if (wordCount >= 15 && wordCount <= 30) score += 1;

      // Boost sentences with math notation
      if (/\$[^$]+\$|\\[a-z]+/i.test(sent)) score += 2;

      // Boost declarative sentences (definitions, theorems)
      if (/^(a|an|the|we|let|suppose|if|def|note|recall|since|because|therefore|thus)\b/i.test(sent.trim())) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });

    if (bestScore < 2) return null;

    // Build snippet: best sentence + surrounding context
    const start = Math.max(0, bestIdx - 0);
    const end = Math.min(sentences.length, bestIdx + 2);
    let snippet = sentences.slice(start, end).join(' ');

    if (snippet.length > maxLen) {
      snippet = snippet.substring(0, maxLen).replace(/\s\S*$/, '') + '…';
    }

    return { snippet, score: bestScore, sentenceIdx: bestIdx };
  }

  /* ════════════════════════════════════════════════════════════════
     6. TF-IDF RARE TERM BOOST
     Rare mathematical terms should contribute more to relevance.
     Common words like "function" or "equation" contribute less.
     ════════════════════════════════════════════════════════════════ */

  // Approximate document frequency (high=common, low=rare in math context)
  const TERM_FREQUENCY = {
    // Very common (low boost)
    'function': 0.95, 'equation': 0.9, 'number': 0.9, 'prove': 0.85,
    'find': 0.9, 'show': 0.9, 'solve': 0.85, 'value': 0.85,
    'set': 0.85, 'let': 0.95, 'real': 0.8, 'integer': 0.75,
    'positive': 0.8, 'negative': 0.75, 'continuous': 0.7,
    'sequence': 0.7, 'series': 0.7, 'limit': 0.7,
    'integral': 0.65, 'derivative': 0.65, 'matrix': 0.6,

    // Moderately common
    'convergence': 0.5, 'polynomial': 0.55, 'vector': 0.55,
    'eigenvalue': 0.4, 'determinant': 0.45, 'topology': 0.35,
    'measure': 0.4, 'compact': 0.35, 'bounded': 0.45,
    'homomorphism': 0.3, 'isomorphism': 0.3, 'manifold': 0.25,
    'bijection': 0.3, 'surjection': 0.25, 'injection': 0.25,

    // Rare (high boost)
    'cohomology': 0.1, 'sheaf': 0.08, 'scheme': 0.15,
    'functor': 0.1, 'etale': 0.05, 'perverse': 0.03,
    'spectral sequence': 0.05, 'moduli': 0.08, 'topos': 0.04,
    'operads': 0.03, 'shimura': 0.04, 'langlands': 0.05,
    'automorphic': 0.05, 'fibonacci': 0.35, 'mersenne': 0.15,
    'catalan': 0.15, 'riemann zeta': 0.1, 'cauchy-schwarz': 0.2,
    'holder': 0.15, 'minkowski': 0.15, 'sobolev': 0.1,
    'dirichlet': 0.15, 'weierstrass': 0.12, 'heine-borel': 0.08,
  };

  /**
   * Compute IDF-style importance weight for each query term.
   * Rarer terms get higher weight.
   * Returns: Map<term, weight>
   */
  function computeTermWeights(query) {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const weights = new Map();

    for (const w of words) {
      const df = TERM_FREQUENCY[w] || 0.5; // Default: moderately common
      // IDF formula: log(1/df) — higher for rare terms
      const idf = Math.log(1 / Math.max(df, 0.01));
      weights.set(w, Math.round(idf * 100) / 100);
    }

    return weights;
  }

  /**
   * Apply TF-IDF weighted scoring to a result.
   * Returns bonus score based on rare term matches.
   */
  function rareTermBoost(item, termWeights) {
    const text = ((item.title || '') + ' ' + (item.body || '')).toLowerCase();
    let boost = 0;

    for (const [term, weight] of termWeights) {
      if (text.includes(term)) {
        boost += weight;
        // Extra boost if rare term is in the title
        if ((item.title || '').toLowerCase().includes(term)) {
          boost += weight * 0.5;
        }
      }
    }

    return Math.round(boost * 10) / 10;
  }

  /* ════════════════════════════════════════════════════════════════
     7. CROSS-CONCEPT BRIDGE SEARCH
     Finds connections between two mathematical concepts.
     E.g., "eigenvalue" + "calculus" → look for "spectral calculus",
     "characteristic polynomial derivative", etc.
     ════════════════════════════════════════════════════════════════ */

  const CONCEPT_BRIDGES = {
    'eigenvalue+calculus': ['matrix exponential', 'spectral theorem calculus', 'matrix derivative'],
    'probability+algebra': ['algebraic probability', 'group rings probability', 'random matrix'],
    'topology+algebra': ['algebraic topology', 'fundamental group', 'homology algebra'],
    'geometry+algebra': ['algebraic geometry', 'coordinate geometry', 'geometric algebra'],
    'analysis+algebra': ['functional analysis', 'operator algebra', 'banach algebra'],
    'number theory+analysis': ['analytic number theory', 'zeta function', 'dirichlet series'],
    'number theory+algebra': ['algebraic number theory', 'ring of integers', 'ideal class group'],
    'calculus+statistics': ['statistical estimation integral', 'moment generating function', 'characteristic function'],
    'linear algebra+calculus': ['matrix calculus', 'jacobian matrix', 'hessian matrix'],
    'probability+calculus': ['stochastic calculus', 'ito integral', 'martingale'],
    'topology+calculus': ['differential forms', 'de rham cohomology', 'stokes theorem'],
    'combinatorics+algebra': ['combinatorial algebra', 'symmetric functions', 'young tableaux'],
    'geometry+calculus': ['differential geometry', 'curvature', 'geodesic'],
    'logic+algebra': ['model theory', 'boolean algebra', 'lattice theory'],
  };

  /**
   * Given a query, detect if it bridges two concepts and return
   * additional bridge search terms.
   */
  function findConceptBridges(query) {
    const lq = query.toLowerCase();
    const bridges = [];

    for (const [key, terms] of Object.entries(CONCEPT_BRIDGES)) {
      const [c1, c2] = key.split('+');
      if (lq.includes(c1) && lq.includes(c2)) {
        bridges.push(...terms);
      }
    }

    // Also check if two broad math areas co-occur
    const areas = ['algebra', 'calculus', 'geometry', 'topology', 'analysis',
      'probability', 'statistics', 'combinatorics', 'number theory', 'logic'];
    const found = areas.filter(a => lq.includes(a));

    if (found.length >= 2 && bridges.length === 0) {
      // Generate generic bridge query
      bridges.push(found.join(' ') + ' connection');
      bridges.push(found.join(' and '));
    }

    return [...new Set(bridges)].slice(0, 3);
  }

  /* ════════════════════════════════════════════════════════════════
     8. ANSWER QUALITY SCORING
     Deep analysis of answer quality beyond just votes.
     ════════════════════════════════════════════════════════════════ */

  /**
   * Score the quality of an answer based on content analysis.
   * Returns a quality score 0-100.
   */
  function scoreAnswerQuality(answer) {
    if (!answer || !answer.body) return 0;
    let score = 0;
    const body = answer.body;
    const text = body.replace(/<[^>]+>/g, '');

    // Length (well-explained answers tend to be longer)
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 50) score += 10;
    if (wordCount >= 150) score += 10;
    if (wordCount >= 300) score += 5;
    if (wordCount < 20) score -= 10;

    // Contains math (LaTeX / MathJax)
    const mathCount = (body.match(/\$[^$]+\$/g) || []).length;
    if (mathCount >= 1) score += 8;
    if (mathCount >= 3) score += 7;
    if (mathCount >= 5) score += 5;

    // Contains code blocks or pre-formatted content
    if (/<pre>|<code>/i.test(body)) score += 5;

    // Structured with headings or lists
    if (/<h[1-6]|<ol|<ul|<li>/i.test(body)) score += 8;

    // Contains step-by-step reasoning keywords
    const stepPatterns = /\b(step\s+\d|first|second|third|finally|therefore|thus|hence|consequently|it follows|we have|we get|we obtain|note that|recall that|observe that|since|because)\b/gi;
    const stepCount = (text.match(stepPatterns) || []).length;
    score += Math.min(stepCount * 3, 15);

    // Contains references or links
    if (/<a\s+href/i.test(body)) score += 3;

    // Vote score (community validation)
    const votes = Math.max(answer.score || 0, 0);
    score += Math.min(votes * 2, 20);

    // Accepted answer
    if (answer.is_accepted) score += 15;

    return Math.min(Math.round(score), 100);
  }

  /* ════════════════════════════════════════════════════════════════
     9. CONFIDENCE ESTIMATION
     Estimates how confident we are in the search results' relevance.
     Used to show/hide "Try refining your search" suggestions.
     ════════════════════════════════════════════════════════════════ */

  /**
   * Estimate search confidence based on result quality signals.
   * Returns { level: 'high'|'medium'|'low', score: 0-100, reason: string }
   */
  function estimateConfidence(items, query) {
    if (!items || items.length === 0) {
      return { level: 'low', score: 0, reason: 'No results found' };
    }

    let score = 0;
    const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    // Factor 1: Number of results
    if (items.length >= 15) score += 20;
    else if (items.length >= 5) score += 10;
    else score += 3;

    // Factor 2: Top result quality
    const topItem = items[0];
    if (topItem._relevanceScore >= 100) score += 25;
    else if (topItem._relevanceScore >= 50) score += 15;
    else score += 5;

    // Factor 3: Title match quality of top 3 results
    const top3 = items.slice(0, 3);
    let titleMatches = 0;
    for (const item of top3) {
      const title = (item.title || '').toLowerCase();
      const matchRatio = qWords.filter(w => title.includes(w)).length / Math.max(qWords.length, 1);
      if (matchRatio >= 0.8) titleMatches++;
    }
    score += titleMatches * 10;

    // Factor 4: Multi-source confirmation
    const multiSource = items.filter(i => i._sourceCount > 1).length;
    score += Math.min(multiSource * 5, 15);

    // Factor 5: Has accepted answers
    const withAccepted = items.slice(0, 5).filter(i => i.accepted_answer_id).length;
    score += withAccepted * 4;

    score = Math.min(Math.round(score), 100);

    let level, reason;
    if (score >= 65) {
      level = 'high';
      reason = 'Strong matches found across multiple sources';
    } else if (score >= 35) {
      level = 'medium';
      reason = 'Partial matches found — try refining your query';
    } else {
      level = 'low';
      reason = 'Weak matches — consider rephrasing or simplifying';
    }

    return { level, score, reason };
  }

  /* ════════════════════════════════════════════════════════════════
     10. QUERY SUGGESTION ENGINE
     Generates "Related searches" and "Did you mean?" suggestions
     based on query analysis, not just typo correction.
     ════════════════════════════════════════════════════════════════ */

  /**
   * Generate related search suggestions for the current query.
   * Returns up to 5 alternative search queries.
   */
  function generateSuggestions(query, items) {
    const suggestions = [];
    const lq = query.toLowerCase();
    const intents = detectIntent(query);

    // Suggestion 1: Add detected intent if not already in query
    if (intents.length > 0 && intents[0].intent !== 'generic') {
      const prefix = intents[0].queryPrefix;
      if (!lq.includes(prefix)) {
        suggestions.push({ text: `${prefix} ${query}`, reason: `Try as "${prefix}" query` });
      }
    }

    // Suggestion 2: From concept bridges
    const bridges = findConceptBridges(query);
    for (const b of bridges.slice(0, 1)) {
      suggestions.push({ text: b, reason: 'Cross-concept connection' });
    }

    // Suggestion 3: From tags of top results
    if (items && items.length > 0) {
      const tagCounts = new Map();
      for (const item of items.slice(0, 5)) {
        for (const tag of (item.tags || [])) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
      const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
      for (const [tag] of topTags) {
        const tagQuery = tag.replace(/-/g, ' ');
        if (!lq.includes(tagQuery) && tagQuery.length > 3) {
          suggestions.push({ text: `${query} [${tag}]`, reason: `Narrow by ${tag}` });
        }
      }
    }

    // Suggestion 4: Semantic rewrites
    const rewrites = rewriteQuery(query);
    for (const v of rewrites.variants.slice(0, 1)) {
      if (v.toLowerCase() !== lq) {
        suggestions.push({ text: v, reason: 'Alternative phrasing' });
      }
    }

    // Suggestion 5: Broader/narrower query
    const words = query.split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 4) {
      // Suggest shorter (broader) query
      suggestions.push({ text: words.slice(0, Math.ceil(words.length / 2)).join(' '), reason: 'Broader search' });
    } else if (words.length <= 2 && items && items.length > 10) {
      // Suggest adding a qualifier
      const commonTags = items.slice(0, 3).flatMap(i => i.tags || []);
      const topTag = commonTags[0];
      if (topTag) {
        suggestions.push({ text: `${query} ${topTag.replace(/-/g, ' ')}`, reason: 'Narrower search' });
      }
    }

    // Deduplicate by text
    const seen = new Set();
    return suggestions.filter(s => {
      const key = s.text.toLowerCase();
      if (seen.has(key) || key === lq) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  }

  /* ════════════════════════════════════════════════════════════════
     11. RESULT CLUSTERING
     Groups results into thematic clusters for better navigation.
     ════════════════════════════════════════════════════════════════ */

  /**
   * Cluster results by dominant tags/topics.
   * Returns: [{ label, items, tag }]
   */
  function clusterResults(items, maxClusters = 4) {
    if (items.length < 5) return []; // Too few to cluster

    const tagCounts = new Map();
    for (const item of items) {
      for (const tag of (item.tags || [])) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // Pick top tags as cluster labels
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxClusters)
      .filter(([, count]) => count >= 2);

    if (topTags.length < 2) return [];

    return topTags.map(([tag, count]) => ({
      label: tag.replace(/-/g, ' '),
      tag,
      count,
      items: items.filter(i => (i.tags || []).includes(tag)),
    }));
  }

  /* ════════════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════════════ */
  return {
    // Intent & Rewriting
    detectIntent,
    rewriteQuery,

    // Recall
    generateFallbacks,

    // Quality
    detectDuplicates,
    extractBestSnippet,
    scoreAnswerQuality,

    // Scoring
    computeTermWeights,
    rareTermBoost,

    // Discovery
    findConceptBridges,
    generateSuggestions,
    clusterResults,

    // Confidence
    estimateConfidence,

    // Utilities
    textFingerprint,
    jaccardSimilarity,
  };

})();
