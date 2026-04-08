/* ================================================================
   search-enhance.js — Advanced Search Enhancement Engine
   ================================================================
   Adds 13 search strategies on top of the base 3-query search:

   1.  Synonym Expansion      — Rewrites query with math synonyms
   2.  Tag Inference           — Maps query words to SE math tags
   3.  Query Decomposition     — Splits complex queries into sub-queries
   4.  Related Questions       — Fetches /questions/{id}/related
   5.  Linked Questions        — Fetches /questions/{id}/linked
   6.  Smart Relevance Score   — Multi-signal BM25-inspired ranking
   7.  Weighted Phrase Search   — Exact phrase in "quotes" via API
   8.  Negation Awareness      — Strips NOT/minus terms for SE API
   9.  Hot Questions by Tag    — Trending Qs in inferred tags
   10. Wiki/Tag-Wiki Lookup    — Tag info excerpts for context
   11. Answer-Content Search   — Searches answer bodies specifically
   12. Cross-Site Search       — Parallel search on MathOverflow
   13. Google Site-Search       — Fallback web search via Google

   All methods are exposed through the SearchEnhance namespace.
   ================================================================ */

const SearchEnhance = (() => {

  /* ──────────────────────────────────────────────────────────────
     1. MATH SYNONYM DICTIONARY
     Maps a keyword to an array of alternative search terms.
     When a user searches "eigenvalue", we also search
     "characteristic value", "spectrum", etc.
     ────────────────────────────────────────────────────────────── */
  const MATH_SYNONYMS = {
    // ── Calculus ──
    'integral'       : ['integration', 'antiderivative', 'integrate', 'definite integral', 'indefinite integral', 'riemann integral'],
    'integration'    : ['integral', 'antiderivative', 'integrate'],
    'derivative'     : ['differentiation', 'differential', 'differentiate', 'gradient'],
    'differentiation': ['derivative', 'differential', 'differentiate'],
    'limit'          : ['limiting', 'convergence', 'tends to', 'approaches'],
    'convergence'    : ['converge', 'convergent', 'limit', 'tends to'],
    'divergence'     : ['diverge', 'divergent'],
    'series'         : ['summation', 'infinite series', 'power series', 'taylor series', 'fourier series'],
    'taylor'         : ['taylor series', 'taylor expansion', 'maclaurin', 'power series'],
    'fourier'        : ['fourier series', 'fourier transform', 'harmonic analysis'],
    'laplace'        : ['laplace transform', 'laplacian'],
    'continuity'     : ['continuous', 'continuous function'],
    'continuous'     : ['continuity', 'continuum'],

    // ── Linear Algebra ──
    'eigenvalue'     : ['eigenvalues', 'eigenvector', 'characteristic value', 'characteristic polynomial', 'spectrum', 'spectral'],
    'eigenvector'    : ['eigenvalue', 'eigenvectors', 'eigenspace'],
    'matrix'         : ['matrices', 'linear transformation', 'linear map', 'linear operator'],
    'determinant'    : ['det', 'matrix determinant', 'cofactor'],
    'inverse'        : ['invertible', 'inverse matrix', 'inverse function'],
    'transpose'      : ['transposition', 'conjugate transpose', 'adjoint'],
    'rank'           : ['matrix rank', 'column rank', 'row rank', 'nullity'],
    'kernel'         : ['null space', 'nullspace', 'ker'],
    'vector space'   : ['linear space', 'subspace', 'basis', 'dimension', 'span'],
    'basis'          : ['orthogonal basis', 'orthonormal basis', 'base', 'spanning set'],
    'orthogonal'     : ['orthogonality', 'perpendicular', 'orthonormal'],
    'norm'           : ['normed', 'magnitude', 'length', 'euclidean norm'],
    'inner product'  : ['dot product', 'scalar product', 'inner product space'],
    'diagonalization': ['diagonalize', 'diagonal matrix', 'similar matrix'],

    // ── Abstract Algebra ──
    'group'          : ['group theory', 'subgroup', 'abelian group', 'cyclic group', 'permutation group'],
    'ring'           : ['ring theory', 'ideal', 'commutative ring', 'principal ideal'],
    'field'          : ['field extension', 'galois field', 'algebraic field', 'galois theory'],
    'homomorphism'   : ['morphism', 'group homomorphism', 'ring homomorphism', 'map'],
    'isomorphism'    : ['isomorphic', 'algebraic isomorphism', 'group isomorphism'],
    'subgroup'       : ['normal subgroup', 'quotient group', 'coset'],

    // ── Topology ──
    'topology'       : ['topological', 'topological space', 'open set', 'closed set'],
    'compact'        : ['compactness', 'compact set', 'compact space', 'sequentially compact'],
    'connected'      : ['connectedness', 'path-connected', 'simply connected'],
    'homeomorphism'  : ['homeomorphic', 'topologically equivalent', 'bicontinuous'],
    'metric'         : ['metric space', 'distance', 'distance function'],
    'open set'       : ['open sets', 'neighborhood', 'open ball', 'interior'],
    'closed set'     : ['closed sets', 'closure', 'closed ball'],

    // ── Number Theory ──
    'prime'          : ['prime number', 'primes', 'primality', 'prime factorization'],
    'divisibility'   : ['divisible', 'divides', 'factor', 'divisor'],
    'modular'        : ['modular arithmetic', 'congruence', 'mod', 'modulo'],
    'congruence'     : ['congruent', 'modular arithmetic', 'modulo'],
    'diophantine'    : ['diophantine equation', 'integer solutions'],
    'gcd'            : ['greatest common divisor', 'euclidean algorithm', 'highest common factor'],
    'lcm'            : ['least common multiple', 'lowest common multiple'],

    // ── Probability & Statistics ──
    'probability'    : ['probabilistic', 'chance', 'stochastic', 'random'],
    'distribution'   : ['probability distribution', 'density', 'pdf', 'cdf', 'pmf'],
    'expectation'    : ['expected value', 'mean', 'average', 'E[X]'],
    'variance'       : ['standard deviation', 'var', 'spread', 'dispersion'],
    'random variable': ['rv', 'stochastic variable', 'random quantity'],
    'normal'         : ['gaussian', 'normal distribution', 'bell curve'],
    'binomial'       : ['binomial distribution', 'bernoulli', 'binomial coefficient'],
    'poisson'        : ['poisson distribution', 'poisson process'],
    'bayes'          : ['bayesian', 'bayes theorem', 'posterior', 'prior'],
    'conditional'    : ['conditional probability', 'given', 'bayes'],
    'independence'   : ['independent', 'independent events', 'independent random variables'],

    // ── Combinatorics ──
    'combinatorics'  : ['counting', 'enumeration', 'combinatorial'],
    'permutation'    : ['permutations', 'arrangement', 'ordering'],
    'combination'    : ['combinations', 'choose', 'binomial coefficient', 'n choose k'],
    'pigeonhole'     : ['pigeonhole principle', 'dirichlet principle'],
    'inclusion exclusion': ['inclusion-exclusion', 'sieve', 'PIE'],
    'recurrence'     : ['recurrence relation', 'recursion', 'recursive', 'difference equation'],
    'generating function': ['generating functions', 'ogf', 'egf', 'formal power series'],

    // ── Analysis ──
    'measure'        : ['measure theory', 'lebesgue measure', 'sigma algebra'],
    'lebesgue'       : ['lebesgue integral', 'lebesgue measure', 'measurable'],
    'uniform convergence': ['uniformly convergent', 'pointwise convergence'],
    'cauchy'         : ['cauchy sequence', 'cauchy criterion', 'cauchy-schwarz'],
    'bounded'        : ['boundedness', 'upper bound', 'lower bound', 'supremum', 'infimum'],
    'supremum'       : ['sup', 'least upper bound', 'lub'],
    'infimum'        : ['inf', 'greatest lower bound', 'glb'],

    // ── Differential equations ──
    'ode'            : ['ordinary differential equation', 'differential equation', 'first order ode', 'second order ode'],
    'pde'            : ['partial differential equation', 'heat equation', 'wave equation', 'laplace equation'],
    'differential equation': ['ode', 'pde', 'solving differential', 'dsolve'],
    'boundary'       : ['boundary condition', 'boundary value', 'initial condition', 'bvp'],
    'initial value'  : ['initial condition', 'ivp', 'cauchy problem'],

    // ── Geometry ──
    'triangle'       : ['triangles', 'trigonometry', 'pythagorean'],
    'circle'         : ['circular', 'radius', 'diameter', 'circumference'],
    'area'           : ['surface area', 'region', 'cross section'],
    'volume'         : ['solid', 'three-dimensional', 'integral volume'],
    'angle'          : ['angles', 'degree', 'radian'],
    'congruent'      : ['congruence', 'similar', 'isometry'],
    'parallel'       : ['parallel lines', 'parallelism', 'transversal'],
    'perpendicular'  : ['orthogonal', 'normal', 'right angle'],

    // ── Set Theory & Logic ──
    'set'            : ['sets', 'set theory', 'subset', 'superset', 'element'],
    'subset'         : ['subsets', 'proper subset', 'containment'],
    'union'          : ['set union', 'join', 'cup'],
    'intersection'   : ['set intersection', 'meet', 'cap'],
    'complement'     : ['set complement', 'relative complement'],
    'cardinality'    : ['cardinal number', 'set size', 'countable', 'uncountable'],
    'countable'      : ['countably infinite', 'enumerable', 'denumerable'],
    'bijection'      : ['bijective', 'one-to-one and onto', 'one-to-one correspondence'],
    'injection'      : ['injective', 'one-to-one', 'monomorphism'],
    'surjection'     : ['surjective', 'onto', 'epimorphism'],
    'proof'          : ['prove', 'theorem', 'lemma', 'proposition', 'show that'],
    'induction'      : ['mathematical induction', 'strong induction', 'inductive', 'inductive step'],
    'contradiction'  : ['proof by contradiction', 'reductio ad absurdum', 'assume not'],
    'contrapositive' : ['contraposition', 'logically equivalent'],

    // ── Complex Analysis ──
    'analytic'       : ['holomorphic', 'complex differentiable', 'regular'],
    'holomorphic'    : ['analytic', 'complex analytic', 'complex differentiable'],
    'residue'        : ['residue theorem', 'residue calculus', 'contour integral', 'pole'],
    'contour'        : ['contour integral', 'line integral', 'path integral', 'complex integral'],
    'pole'           : ['singularity', 'singular point', 'isolated singularity'],

    // ── Optimization ──
    'maximum'        : ['max', 'maximize', 'supremum', 'global maximum', 'local maximum'],
    'minimum'        : ['min', 'minimize', 'infimum', 'global minimum', 'local minimum'],
    'optimization'   : ['optimize', 'extremum', 'critical point', 'lagrange multiplier'],
    'lagrange'       : ['lagrange multiplier', 'lagrangian', 'constrained optimization'],

    // ── Common function terms ──
    'exponential'    : ['exp', 'e^x', 'natural exponential'],
    'logarithm'      : ['log', 'ln', 'natural logarithm', 'logarithmic'],
    'trigonometric'  : ['trig', 'sin', 'cos', 'tan', 'trigonometry'],
    'polynomial'     : ['polynomials', 'degree', 'coefficient', 'algebraic'],
    'rational'       : ['rational function', 'fraction', 'ratio'],
    'asymptote'      : ['asymptotic', 'asymptotes', 'behavior at infinity'],
    'singularity'    : ['singular', 'pole', 'essential singularity', 'removable singularity'],
  };

  /* ──────────────────────────────────────────────────────────────
     2. QUERY → SE TAG MAPPING
     Maps keywords to the most-used StackExchange Mathematics tags.
     These are actual tags from math.stackexchange.com.
     ────────────────────────────────────────────────────────────── */
  const TAG_MAP = {
    // Calculus
    'integral'       : ['integration', 'calculus', 'definite-integrals'],
    'integration'    : ['integration', 'calculus', 'definite-integrals'],
    'antiderivative' : ['integration', 'indefinite-integrals'],
    'derivative'     : ['derivatives', 'calculus'],
    'differentiation': ['derivatives', 'calculus'],
    'limit'          : ['limits', 'calculus', 'epsilon-delta'],
    'convergence'    : ['convergence-divergence', 'sequences-and-series'],
    'divergence'     : ['convergence-divergence'],
    'series'         : ['sequences-and-series', 'power-series'],
    'sequence'       : ['sequences-and-series'],
    'taylor'         : ['taylor-expansion', 'power-series'],
    'maclaurin'      : ['taylor-expansion'],
    'fourier'        : ['fourier-analysis', 'fourier-series'],
    'laplace'        : ['laplace-transform'],
    'continuity'     : ['continuity', 'real-analysis'],
    'continuous'     : ['continuity', 'real-analysis'],

    // Linear algebra
    'eigenvalue'     : ['eigenvalues-eigenvectors', 'linear-algebra'],
    'eigenvector'    : ['eigenvalues-eigenvectors', 'linear-algebra'],
    'matrix'         : ['matrices', 'linear-algebra'],
    'matrices'       : ['matrices', 'linear-algebra'],
    'determinant'    : ['determinant', 'matrices'],
    'vector'         : ['vectors', 'linear-algebra'],
    'linear'         : ['linear-algebra'],
    'rank'           : ['matrices', 'linear-algebra'],
    'diagonalization': ['eigenvalues-eigenvectors', 'matrices'],
    'orthogonal'     : ['orthogonality', 'linear-algebra'],
    'inner product'  : ['inner-product-space', 'linear-algebra'],
    'norm'           : ['normed-spaces', 'functional-analysis'],
    'basis'          : ['linear-algebra', 'vector-spaces'],
    'vector space'   : ['vector-spaces', 'linear-algebra'],

    // Abstract algebra
    'group'          : ['group-theory', 'abstract-algebra'],
    'ring'           : ['ring-theory', 'abstract-algebra'],
    'field'          : ['field-theory', 'abstract-algebra'],
    'ideal'          : ['ring-theory', 'ideals'],
    'homomorphism'   : ['group-homomorphism', 'abstract-algebra'],
    'isomorphism'    : ['group-isomorphism', 'abstract-algebra'],
    'subgroup'       : ['group-theory', 'abstract-algebra'],
    'galois'         : ['galois-theory', 'field-theory'],
    'permutation'    : ['permutations', 'group-theory'],
    'abelian'        : ['abelian-groups', 'group-theory'],
    'cyclic'         : ['cyclic-groups', 'group-theory'],

    // Topology
    'topology'       : ['general-topology'],
    'topological'    : ['general-topology'],
    'compact'        : ['compactness', 'general-topology'],
    'connected'      : ['connectedness', 'general-topology'],
    'homeomorphism'  : ['general-topology'],
    'metric'         : ['metric-spaces', 'general-topology'],
    'open set'       : ['general-topology'],
    'closed set'     : ['general-topology'],

    // Number theory
    'prime'          : ['prime-numbers', 'number-theory'],
    'divisibility'   : ['divisibility', 'number-theory'],
    'modular'        : ['modular-arithmetic', 'number-theory'],
    'congruence'     : ['modular-arithmetic', 'number-theory'],
    'diophantine'    : ['diophantine-equations', 'number-theory'],
    'gcd'            : ['divisibility', 'elementary-number-theory'],
    'lcm'            : ['divisibility', 'elementary-number-theory'],

    // Probability & statistics
    'probability'    : ['probability', 'statistics'],
    'distribution'   : ['probability-distributions', 'statistics'],
    'expectation'    : ['expected-value', 'probability'],
    'expected value' : ['expected-value', 'probability'],
    'variance'       : ['variance', 'probability'],
    'random'         : ['probability', 'random-variables'],
    'normal'         : ['normal-distribution', 'probability'],
    'gaussian'       : ['normal-distribution', 'probability'],
    'binomial'       : ['binomial-distribution', 'combinatorics'],
    'poisson'        : ['poisson-distribution', 'probability'],
    'bayes'          : ['bayesian', 'probability', 'conditional-probability'],
    'conditional'    : ['conditional-probability', 'probability'],
    'markov'         : ['markov-chains', 'stochastic-processes'],
    'stochastic'     : ['stochastic-processes', 'probability'],

    // Combinatorics
    'combinatorics'  : ['combinatorics'],
    'combination'    : ['combinatorics', 'binomial-coefficients'],
    'counting'       : ['combinatorics', 'counting'],
    'pigeonhole'     : ['pigeonhole-principle', 'combinatorics'],
    'recurrence'     : ['recurrence-relations', 'sequences-and-series'],
    'recursion'      : ['recurrence-relations'],
    'generating function': ['generating-functions', 'combinatorics'],

    // Analysis
    'real analysis'  : ['real-analysis'],
    'analysis'       : ['real-analysis', 'analysis'],
    'measure'        : ['measure-theory', 'real-analysis'],
    'lebesgue'       : ['lebesgue-integral', 'measure-theory'],
    'cauchy'         : ['cauchy-sequences', 'real-analysis'],
    'bounded'        : ['real-analysis'],
    'supremum'       : ['supremum-and-infimum', 'real-analysis'],
    'infimum'        : ['supremum-and-infimum', 'real-analysis'],
    'uniform'        : ['uniform-convergence', 'real-analysis'],
    'functional analysis': ['functional-analysis'],
    'banach'         : ['banach-spaces', 'functional-analysis'],
    'hilbert'        : ['hilbert-spaces', 'functional-analysis'],

    // Differential equations
    'ode'            : ['ordinary-differential-equations'],
    'pde'            : ['partial-differential-equations', 'pde'],
    'differential equation': ['ordinary-differential-equations', 'differential-equations'],
    'boundary'       : ['boundary-value-problem'],
    'initial value'  : ['initial-value-problems'],
    'laplacian'      : ['partial-differential-equations'],
    'heat equation'  : ['partial-differential-equations', 'heat-equation'],
    'wave equation'  : ['partial-differential-equations', 'wave-equation'],

    // Geometry
    'geometry'       : ['geometry', 'euclidean-geometry'],
    'triangle'       : ['triangles', 'geometry'],
    'circle'         : ['circles', 'geometry'],
    'area'           : ['area', 'geometry'],
    'volume'         : ['volume', 'geometry'],
    'angle'          : ['angle', 'geometry', 'trigonometry'],
    'trigonometry'   : ['trigonometry'],
    'trigonometric'  : ['trigonometry'],

    // Complex analysis
    'complex'        : ['complex-analysis', 'complex-numbers'],
    'analytic'       : ['complex-analysis', 'analytic-functions'],
    'holomorphic'    : ['complex-analysis'],
    'residue'        : ['residue-calculus', 'complex-analysis'],
    'contour'        : ['contour-integration', 'complex-analysis'],

    // Set theory & logic
    'set'            : ['elementary-set-theory'],
    'cardinality'    : ['cardinals', 'elementary-set-theory'],
    'countable'      : ['elementary-set-theory'],
    'bijection'      : ['functions', 'elementary-set-theory'],
    'injection'      : ['functions'],
    'surjection'     : ['functions'],
    'proof'          : ['proof-writing', 'proof-verification'],
    'induction'      : ['induction', 'proof-writing'],
    'contradiction'  : ['proof-writing'],

    // Optimization
    'optimization'   : ['optimization', 'calculus-of-variations'],
    'maximize'       : ['optimization', 'maxima-minima'],
    'minimize'       : ['optimization', 'maxima-minima'],
    'lagrange'       : ['lagrange-multiplier', 'optimization'],
    'convex'         : ['convex-analysis', 'convex-optimization'],

    // Misc
    'inequality'     : ['inequality', 'contest-math'],
    'polynomial'     : ['polynomials', 'algebra-precalculus'],
    'equation'       : ['algebra-precalculus'],
    'solve'          : ['algebra-precalculus', 'solving-equations'],
    'logarithm'      : ['logarithms'],
    'exponential'    : ['exponential-function'],
    'asymptote'      : ['asymptotics'],
  };

  /* ──────────────────────────────────────────────────────────────
     3. EXPAND QUERY — Generate synonym-enhanced variants
     Returns the top N (default 2) most relevant expanded queries.
     ────────────────────────────────────────────────────────────── */
  function expandQuery(query, maxExpansions = 2) {
    const lq = query.toLowerCase().trim();
    const words = lq.split(/\s+/);
    const expansions = [];

    // Match individual words
    for (const word of words) {
      const syns = MATH_SYNONYMS[word];
      if (syns) {
        // Pick the first 2 synonyms that aren't already in the query
        const fresh = syns.filter(s => !lq.includes(s.toLowerCase()));
        for (const s of fresh.slice(0, 2)) {
          // Create expanded query: replace the word with the synonym
          const expanded = query.replace(new RegExp('\\b' + _escReg(word) + '\\b', 'i'), s);
          if (expanded !== query) expansions.push(expanded);
        }
      }
    }

    // Match multi-word phrases
    for (const [phrase, syns] of Object.entries(MATH_SYNONYMS)) {
      if (phrase.includes(' ') && lq.includes(phrase)) {
        const fresh = syns.filter(s => !lq.includes(s.toLowerCase()));
        for (const s of fresh.slice(0, 1)) {
          const expanded = query.replace(new RegExp(_escReg(phrase), 'i'), s);
          if (expanded !== query) expansions.push(expanded);
        }
      }
    }

    // Deduplicate and limit
    const unique = [...new Set(expansions)];
    return unique.slice(0, maxExpansions);
  }

  /* ──────────────────────────────────────────────────────────────
     4. INFER TAGS — Extract relevant SE tags from a query
     Returns an array of tag strings (max 5).
     ────────────────────────────────────────────────────────────── */
  function inferTags(query, maxTags = 5) {
    const lq = query.toLowerCase().trim();
    const words = lq.split(/\s+/);
    const tagScores = new Map(); // tag → score

    // Score tags from individual words
    for (const word of words) {
      const tags = TAG_MAP[word];
      if (tags) {
        tags.forEach((t, i) => {
          const score = (tagScores.get(t) || 0) + (tags.length - i); // Prioritize first-listed tags
          tagScores.set(t, score);
        });
      }
    }

    // Score tags from multi-word phrases (higher priority)
    for (const [phrase, tags] of Object.entries(TAG_MAP)) {
      if (phrase.includes(' ') && lq.includes(phrase)) {
        tags.forEach((t, i) => {
          const score = (tagScores.get(t) || 0) + (tags.length - i) * 2;
          tagScores.set(t, score);
        });
      }
    }

    if (tagScores.size === 0) return [];

    // Sort by score descending, take top N
    return [...tagScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTags)
      .map(([tag]) => tag);
  }

  /* ──────────────────────────────────────────────────────────────
     5. QUERY DECOMPOSITION — Break complex queries into sub-queries
     For "eigenvalue of symmetric matrix", also search:
       • "eigenvalue symmetric matrix"
       • "eigenvalue"
       • "symmetric matrix"
     ────────────────────────────────────────────────────────────── */
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'of', 'for', 'in', 'on', 'to', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'that', 'this',
    'it', 'its', 'and', 'or', 'but', 'not', 'no', 'if', 'how', 'what',
    'when', 'where', 'which', 'who', 'why', 'can', 'does', 'do', 'has',
    'have', 'find', 'show', 'prove', 'compute', 'calculate', 'determine',
    'given', 'let', 'suppose', 'assume', 'using', 'use', 'any', 'all',
    'each', 'every', 'some', 'such', 'than', 'then', 'there', 'whether',
    'about', 'between', 'from', 'into', 'over', 'through', 'under',
  ]);

  function decomposeQuery(query) {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const meaningful = words.filter(w => !STOP_WORDS.has(w));

    if (meaningful.length <= 2) return []; // Query is already simple

    const subQueries = [];

    // Strategy A: Remove stop words to create a cleaner query
    const cleaned = meaningful.join(' ');
    if (cleaned !== query.toLowerCase().trim()) {
      subQueries.push(cleaned);
    }

    // Strategy B: First half + second half (for longer queries)
    if (meaningful.length >= 4) {
      const mid = Math.ceil(meaningful.length / 2);
      subQueries.push(meaningful.slice(0, mid).join(' '));
      subQueries.push(meaningful.slice(mid).join(' '));
    }

    // Strategy C: Sliding 2-gram windows for key concept pairs
    if (meaningful.length >= 3) {
      for (let i = 0; i < meaningful.length - 1; i++) {
        const bigram = meaningful[i] + ' ' + meaningful[i + 1];
        // Only add if it matches a known synonym key or tag
        if (MATH_SYNONYMS[bigram] || TAG_MAP[bigram]) {
          subQueries.push(bigram);
        }
      }
    }

    // Deduplicate and limit
    return [...new Set(subQueries)].slice(0, 3);
  }

  /* ──────────────────────────────────────────────────────────────
     6. FETCH RELATED QUESTIONS — /questions/{ids}/related
     Returns questions that SE considers related to the given IDs.
     ────────────────────────────────────────────────────────────── */
  async function fetchRelated(questionIds, maxIds = 3) {
    const ids = questionIds.slice(0, maxIds);
    if (!ids.length) return [];

    const idStr = ids.join(';');
    const url = `${Config.SE_API}/questions/${idStr}/related?site=${Config.SITE}&filter=${Config.SE_FILTER}&pagesize=10`;

    try {
      const resp = await SearchCache.cachedFetch(url, Config.SEARCH_TIMEOUT_MS);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.items || []).map(item => ({
        ...item,
        _source: 'related',
      }));
    } catch (_) {
      return [];
    }
  }

  /* ──────────────────────────────────────────────────────────────
     7. FETCH LINKED QUESTIONS — /questions/{ids}/linked
     Returns questions that are linked to/from the given IDs.
     ────────────────────────────────────────────────────────────── */
  async function fetchLinked(questionIds, maxIds = 3) {
    const ids = questionIds.slice(0, maxIds);
    if (!ids.length) return [];

    const idStr = ids.join(';');
    const url = `${Config.SE_API}/questions/${idStr}/linked?site=${Config.SITE}&filter=${Config.SE_FILTER}&pagesize=10`;

    try {
      const resp = await SearchCache.cachedFetch(url, Config.SEARCH_TIMEOUT_MS);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.items || []).map(item => ({
        ...item,
        _source: 'linked',
      }));
    } catch (_) {
      return [];
    }
  }

  /* ──────────────────────────────────────────────────────────────
     8. SMART RELEVANCE SCORING
     Multi-signal BM25-inspired scoring that considers:
       - Title match (exact & partial word overlap)
       - Body match (keyword density)
       - Vote score (community quality signal)
       - Has accepted answer (signal of answer quality)
       - Answer count (coverage signal)
       - View count (popularity signal)
       - Source engine (weight different search strategies)
       - Tag relevance (matching inferred tags)
       - Freshness (slight boost for recent questions)
     ────────────────────────────────────────────────────────────── */
  function scoreResult(item, query, inferredTags) {
    let score = 0;
    const q = query.toLowerCase().trim();
    const qWords = q.split(/\s+/).filter(w => !STOP_WORDS.has(w) && w.length > 1);
    const title = (item.title || '').toLowerCase();
    const body = (item.body || '').toLowerCase();
    const excerpt = (item.excerpt || '').toLowerCase();
    const searchText = title + ' ' + body + ' ' + excerpt;
    const signals = {
      exactTitle: false,
      exactBody: false,
      titleWordMatches: 0,
      bodyWordMatches: 0,
      totalQueryWords: qWords.length,
      tagMatches: 0,
      sourceCount: item._sourceCount || 1,
      accepted: !!item.accepted_answer_id,
      answerCount: item.answer_count || 0,
      topAnswerScore: 0,
      hasAnswerMatch: false,
    };

    // ── Title signals (most important) ──
    // Exact full-query match in title
    if (title.includes(q)) {
      score += 55;
      signals.exactTitle = true;
    }
    // Word overlap in title (BM25-like)
    if (qWords.length > 0) {
      const titleWordMatches = qWords.filter(w => title.includes(w)).length;
      signals.titleWordMatches = titleWordMatches;
      score += (titleWordMatches / qWords.length) * 35;
      // Bonus for consecutive word matches in title
      for (let i = 0; i < qWords.length - 1; i++) {
        if (title.includes(qWords[i] + ' ' + qWords[i + 1])) score += 8;
      }
    }

    // ── Body / excerpt signals ──
    if (body.includes(q) || excerpt.includes(q)) {
      score += 20;
      signals.exactBody = true;
    }
    if (qWords.length > 0) {
      const bodyWordMatches = qWords.filter(w => searchText.includes(w)).length;
      signals.bodyWordMatches = bodyWordMatches;
      score += (bodyWordMatches / qWords.length) * 15;
    }

    // ── Keyword density (how concentrated are query terms) ──
    if (body.length > 50 && qWords.length > 0) {
      const matches = qWords.filter(w => body.includes(w)).length;
      const density = matches / Math.max(body.split(/\s+/).length / 100, 1);
      score += Math.min(density * 3, 12);
    }

    // ── Community quality signals ──
    // Vote score (capped to prevent domination)
    const voteScore = Math.min(Math.max(item.score || 0, -5), 100);
    score += voteScore > 0 ? Math.log1p(voteScore) * 6 : voteScore * 0.5;

    // Accepted answer — strong quality signal
    if (item.accepted_answer_id) score += 12;

    // Answer count
    const ansCount = Math.min(item.answer_count || 0, 20);
    score += Math.log1p(ansCount) * 4;

    // View count (popularity)
    score += Math.log1p(item.view_count || 0) * 1.5;

    // ── Tag relevance ──
    if (inferredTags && inferredTags.length > 0 && item.tags) {
      const itemTags = new Set((item.tags || []).map(t => t.toLowerCase()));
      const tagMatches = inferredTags.filter(t => itemTags.has(t.toLowerCase())).length;
      signals.tagMatches = tagMatches;
      score += tagMatches * 8;
    }

    // ── Source engine weight ──
    const sourceWeights = {
      'advanced'    : 5,
      'excerpts'    : 3,
      'similar'     : 4,
      'tagged'      : 2,
      'synonym'     : 3,
      'decompose'   : 2,
      'related'     : 4,
      'linked'      : 4,
      'phrase'      : 6,   // Exact phrase match is very strong
      'ans-body'    : 3,   // Found in answer body
      'mathoverflow': 5,   // Cross-site high-quality
      'hot'         : 2,   // Trending but not query-specific
      'google'      : 4,   // Google knows relevance
    };
    score += sourceWeights[item._source] || 0;

    // ── Multiple source bonus ──
    if (item._sourceCount && item._sourceCount > 1) {
      score += item._sourceCount * 6;
      signals.sourceCount = item._sourceCount;
    }

    // ── Freshness bonus (slight) ──
    if (item.creation_date) {
      const ageYears = (Date.now() / 1000 - item.creation_date) / (365.25 * 86400);
      if (ageYears < 1) score += 5;
      else if (ageYears < 3) score += 2;
    }

    // ── Answer quality signals ──
    if (item.answers && item.answers.length > 0) {
      const topScore = Math.max(...item.answers.map(a => a.score || 0));
      signals.topAnswerScore = topScore;
      score += Math.min(Math.log1p(topScore) * 3, 10);
      const hasAccepted = item.answers.some(a => a.is_accepted);
      if (hasAccepted) score += 5;
      // Bonus for answer content matching query terms
      for (const ans of item.answers) {
        if (ans.body) {
          const ansBody = ans.body.toLowerCase();
          const ansMatches = qWords.filter(w => ansBody.includes(w)).length;
          if (ansMatches >= qWords.length * 0.7) {
            score += 8; // Strong answer content match
            signals.hasAnswerMatch = true;
            break;
          } else if (ansMatches >= qWords.length * 0.4) {
            score += 4; // Partial answer content match
            signals.hasAnswerMatch = true;
            break;
          }
        }
      }
    }

    // ── Formula similarity boost (from LaTeX-aware scan) ──
    if (item._formulaSimilarity && item._formulaSimilarity > 0.1) {
      score += item._formulaSimilarity * 30;
    }

    item._searchSignals = signals;
    return Math.round(score * 100) / 100;
  }

  function compareByBestQuality(left, right) {
    const scoreDiff = (right._relevanceScore || 0) - (left._relevanceScore || 0);
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff;

    const sourceDiff = (right._sourceCount || 1) - (left._sourceCount || 1);
    if (sourceDiff !== 0) return sourceDiff;

    const answerDiff = (right.answer_count || 0) - (left.answer_count || 0);
    if (answerDiff !== 0) return answerDiff;

    const voteDiff = (right.score || 0) - (left.score || 0);
    if (voteDiff !== 0) return voteDiff;

    return (right.view_count || 0) - (left.view_count || 0);
  }

  function applyDisplaySort(items, sortMode) {
    const sorted = [...(items || [])];
    const mode = sortMode || 'best';

    if (mode === 'votes') {
      sorted.sort((left, right) => {
        const voteDiff = (right.score || 0) - (left.score || 0);
        if (voteDiff !== 0) return voteDiff;
        return compareByBestQuality(left, right);
      });
      return sorted;
    }

    if (mode === 'creation') {
      sorted.sort((left, right) => {
        const timeDiff = (right.creation_date || 0) - (left.creation_date || 0);
        if (timeDiff !== 0) return timeDiff;
        return compareByBestQuality(left, right);
      });
      return sorted;
    }

    if (mode === 'activity') {
      sorted.sort((left, right) => {
        const leftActivity = left.last_activity_date || left.last_edit_date || left.creation_date || 0;
        const rightActivity = right.last_activity_date || right.last_edit_date || right.creation_date || 0;
        const timeDiff = rightActivity - leftActivity;
        if (timeDiff !== 0) return timeDiff;
        return compareByBestQuality(left, right);
      });
      return sorted;
    }

    sorted.sort(compareByBestQuality);
    return sorted;
  }

  /* ──────────────────────────────────────────────────────────────
     9. RANK RESULTS — Sort by relevance score
     Also handles deduplication with source-count tracking.
     ────────────────────────────────────────────────────────────── */
  function getResultKey(item) {
    if (!item) return '';
    if (item.question_id != null && item.question_id !== '') return `qid:${item.question_id}`;
    if (item.link) return `url:${item.link}`;
    if (item.title) return `title:${item.title}`;
    return '';
  }

  function rankResults(items, query, inferredTags) {
    // Deduplicate, tracking how many sources found each question
    const byId = new Map();
    for (const item of items) {
      const key = getResultKey(item);
      if (!key) continue;
      if (byId.has(key)) {
        const existing = byId.get(key);
        existing._sourceCount = (existing._sourceCount || 1) + 1;
        existing._sources = existing._sources || [existing._source];
        if (!existing._sources.includes(item._source)) {
          existing._sources.push(item._source);
        }
        // Merge any missing data
        if (!existing.body && item.body) existing.body = item.body;
        if (!existing.excerpt && item.excerpt) existing.excerpt = item.excerpt;
        if (!existing.tags && item.tags) existing.tags = item.tags;
        if (item.answers && item.answers.length > (existing.answers || []).length) {
          existing.answers = item.answers;
        }
      } else {
        byId.set(key, { ...item, _sourceCount: 1, _sources: [item._source] });
      }
    }

    const deduped = [...byId.values()];

    // Score each result
    for (const item of deduped) {
      item._relevanceScore = scoreResult(item, query, inferredTags);
    }

    // Sort by relevance score descending
    deduped.sort((a, b) => b._relevanceScore - a._relevanceScore);

    return deduped;
  }

  /* ──────────────────────────────────────────────────────────────
     10. WEIGHTED PHRASE SEARCH
     Detects quoted phrases and key multi-word concepts,
     builds exact-phrase queries using SE's "quoted" syntax.
     ────────────────────────────────────────────────────────────── */
  function extractPhrases(query) {
    const phrases = [];
    // User-supplied quoted phrases
    const quotedRe = /"([^"]{3,})"/g;
    let m;
    while ((m = quotedRe.exec(query)) !== null) phrases.push(m[1]);
    // Auto-detect known multi-word concepts
    const lq = query.toLowerCase();
    for (const phrase of Object.keys(MATH_SYNONYMS)) {
      if (phrase.includes(' ') && lq.includes(phrase) && !phrases.some(p => p.toLowerCase() === phrase)) {
        phrases.push(phrase);
      }
    }
    for (const phrase of Object.keys(TAG_MAP)) {
      if (phrase.includes(' ') && lq.includes(phrase) && !phrases.some(p => p.toLowerCase() === phrase)) {
        phrases.push(phrase);
      }
    }
    return [...new Set(phrases)].slice(0, 3);
  }

  /* ──────────────────────────────────────────────────────────────
     11. NEGATION AWARENESS
     Parses query for NOT / minus terms so the SE API isn't
     confused. Returns { clean, negated }.
     e.g. "integral NOT improper" → { clean:"integral", negated:["improper"] }
     ────────────────────────────────────────────────────────────── */
  function parseNegation(query) {
    const negated = [];
    let clean = query;
    // Match -word or NOT word patterns
    clean = clean.replace(/(?:^|\s)(?:NOT\s+|-)([\w]+)/gi, (_, word) => {
      negated.push(word.toLowerCase());
      return ' ';
    });
    clean = clean.replace(/\s{2,}/g, ' ').trim();
    return { clean, negated };
  }

  /* ──────────────────────────────────────────────────────────────
     12. HOT QUESTIONS BY TAG
     Fetches trending/hot questions in the inferred tags.
     Good for discovery when query is a broad topic.
     ────────────────────────────────────────────────────────────── */
  async function fetchHotByTag(tags, maxTags = 2) {
    if (!tags || !tags.length) return [];
    const tagStr = tags.slice(0, maxTags).join(';');
    const params = new URLSearchParams({
      order: 'desc', sort: 'hot', site: Config.SITE,
      tagged: tagStr, filter: Config.SE_FILTER,
      pagesize: '8',
    });
    const url = `${Config.SE_API}/questions?${params}`;
    try {
      const resp = await SearchCache.cachedFetch(url, Config.SEARCH_TIMEOUT_MS);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.items || []).map(item => ({ ...item, _source: 'hot' }));
    } catch (_) { return []; }
  }

  /* ──────────────────────────────────────────────────────────────
     13. WIKI / TAG-WIKI LOOKUP
     Fetches tag wiki excerpts for context / "Did you know?" panel.
     Not used for ranking but provides educational context.
     ────────────────────────────────────────────────────────────── */
  async function fetchTagWikis(tags, maxTags = 3) {
    if (!tags || !tags.length) return [];
    const tagStr = tags.slice(0, maxTags).join(';');
    const url = `${Config.SE_API}/tags/${tagStr}/wikis?site=${Config.SITE}`;
    try {
      const resp = await SearchCache.cachedFetch(url, Config.SEARCH_TIMEOUT_MS);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.items || []).map(w => ({
        tag: w.tag_name || '',
        excerpt: w.excerpt || '',
        body: w.body || '',
      })).filter(w => w.excerpt);
    } catch (_) { return []; }
  }

  /* ──────────────────────────────────────────────────────────────
     14. ANSWER-CONTENT SEARCH
     Uses /search/excerpts filtered to answer items only.
     Catches results where the answer (not the question) contains
     the key terms — important for "how to solve X" queries.
     ────────────────────────────────────────────────────────────── */
  function buildAnswerSearchUrl(query, page, pagesize) {
    // /search/excerpts returns both Q and A items.
    // We fire a second excerpts search with different sort for answer coverage.
    const params = new URLSearchParams({
      order: 'desc', sort: 'votes', site: Config.SITE,
      page, pagesize: Math.min(pagesize, 15), q: query,
    });
    return `${Config.SE_API}/search/excerpts?${params}`;
  }

  /* ──────────────────────────────────────────────────────────────
     15. CROSS-SITE SEARCH (MathOverflow)
     For advanced/professional queries, also search MathOverflow.
     Triggered when query contains graduate-level keywords.
     ────────────────────────────────────────────────────────────── */
  const ADVANCED_KEYWORDS = new Set([
    'manifold', 'cohomology', 'homology', 'sheaf', 'scheme', 'functor',
    'category', 'homotopy', 'spectral sequence', 'algebraic geometry',
    'differential geometry', 'algebraic topology', 'representation theory',
    'riemann surface', 'lie group', 'lie algebra', 'moduli', 'etale',
    'derived', 'perverse', 'topos', 'stacks', 'fibration', 'monad',
    'adjunction', 'colimit', 'presheaf', 'simplicial', 'infinity category',
    'motivic', 'adic', 'shimura', 'langlands', 'automorphic', 'modular form',
    'elliptic curve', 'abelian variety', 'class field', 'zeta function',
    'l-function', 'riemann hypothesis', 'ergodic', 'dynamical system',
    'sobolev', 'distribution theory', 'schwartz', 'operator algebra',
    'von neumann', 'c*-algebra', 'k-theory', 'index theorem',
    'atiyah-singer', 'hodge', 'kahler', 'symplectic', 'poisson',
    'formal', 'deformation', 'operad', 'dg-category',
    'noncommutative', 'quantum group',
  ]);

  function shouldCrossSearch(query) {
    const lq = query.toLowerCase();
    return [...ADVANCED_KEYWORDS].some(kw => lq.includes(kw));
  }

  function buildCrossSiteUrl(query, page, pagesize) {
    const params = new URLSearchParams({
      order: 'desc', sort: 'relevance', site: 'mathoverflow',
      page, pagesize: Math.min(pagesize, 8), q: query,
      filter: Config.SE_FILTER,
    });
    return `${Config.SE_API}/search/advanced?${params}`;
  }

  /* ──────────────────────────────────────────────────────────────
     16. GOOGLE SITE-SEARCH FALLBACK
     When SE API returns few results, use Google Custom Search
     to scrape math.stackexchange.com via a redirect URL.
     Returns a Google search URL the user can click, and also
     attempts to extract question IDs from Google's redirect.
     ────────────────────────────────────────────────────────────── */
  function buildGoogleFallbackUrl(query) {
    const encoded = encodeURIComponent(`site:math.stackexchange.com ${query}`);
    return `https://www.google.com/search?q=${encoded}`;
  }

  // Attempt to scrape question IDs from Google's HTML results via CORS proxy
  async function fetchGoogleResults(query, maxResults = 8) {
    const encoded = encodeURIComponent(`site:math.stackexchange.com ${query}`);
    const googleUrl = `https://www.google.com/search?q=${encoded}&num=10`;
    const proxies = (Config && Config.CORS_PROXIES) || [];
    for (const proxy of proxies) {
      try {
        const resp = await fetchWithTimeout(proxy + encodeURIComponent(googleUrl), 8000);
        if (!resp.ok) continue;
        const html = await resp.text();
        // Extract question IDs from URLs
        const idRe = /math\.stackexchange\.com\/questions\/(\d+)/g;
        const ids = new Set();
        let match;
        while ((match = idRe.exec(html)) !== null && ids.size < maxResults) {
          ids.add(parseInt(match[1], 10));
        }
        if (ids.size > 0) {
          // Fetch these questions from SE API
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

  const WEB_MATH_DOMAINS = [
    { host: 'mathoverflow.net', label: 'MathOverflow' },
    { host: 'artofproblemsolving.com', label: 'Art of Problem Solving' },
    { host: 'proofwiki.org', label: 'ProofWiki' },
    { host: 'planetmath.org', label: 'PlanetMath' },
    { host: 'mathworld.wolfram.com', label: 'MathWorld' },
    { host: 'encyclopediaofmath.org', label: 'Encyclopedia of Mathematics' },
  ];

  async function fetchHtmlWithProxyFallback(url, timeoutMs) {
    try {
      const resp = await fetchWithTimeout(url, timeoutMs);
      if (resp.ok) return await resp.text();
    } catch (_) {}

    const proxies = (Config && Config.CORS_PROXIES) || [];
    for (const proxy of proxies) {
      try {
        const resp = await fetchWithTimeout(proxy + encodeURIComponent(url), timeoutMs);
        if (resp.ok) return await resp.text();
      } catch (_) {}
    }

    return '';
  }

  function decodeDuckDuckGoLink(href) {
    if (!href) return '';
    try {
      const parsed = new URL(href, 'https://duckduckgo.com');
      const redirected = parsed.searchParams.get('uddg');
      return redirected ? decodeURIComponent(redirected) : parsed.toString();
    } catch (_) {
      return href;
    }
  }

  function getDomainLabel(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      const match = WEB_MATH_DOMAINS.find(domain => host === domain.host || host.endsWith('.' + domain.host));
      return match ? match.label : host;
    } catch (_) {
      return 'Math Web';
    }
  }

  function isAllowedMathDomain(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return WEB_MATH_DOMAINS.some(domain => host === domain.host || host.endsWith('.' + domain.host));
    } catch (_) {
      return false;
    }
  }

  async function fetchExternalMathResults(query, maxResults = 8) {
    const scope = WEB_MATH_DOMAINS.map(domain => `site:${domain.host}`).join(' OR ');
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${scope} ${query}`)}`;
    const html = await fetchHtmlWithProxyFallback(searchUrl, 9000);
    if (!html) return [];

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const anchors = doc.querySelectorAll('a.result__a');
    const results = [];
    const seen = new Set();

    for (const anchor of anchors) {
      const link = decodeDuckDuckGoLink(anchor.getAttribute('href') || '');
      const title = (anchor.textContent || '').trim();
      if (!title || !link || !isAllowedMathDomain(link)) continue;
      if (seen.has(link)) continue;
      seen.add(link);

      const container = anchor.closest('.result');
      const snippet = container && container.querySelector('.result__snippet')
        ? container.querySelector('.result__snippet').textContent.trim()
        : '';
      const label = getDomainLabel(link);

      results.push({
        title,
        link,
        score: 0,
        answer_count: 0,
        view_count: 0,
        creation_date: null,
        accepted_answer_id: null,
        tags: [],
        owner: { display_name: label },
        excerpt: snippet,
        item_type: 'external',
        _source: 'web-math',
        _externalSource: label,
      });

      if (results.length >= maxResults) break;
    }

    return results;
  }

  /* ──────────────────────────────────────────────────────────────
     BUILD ENHANCED QUERIES — Main orchestrator (updated)
     Takes the original query and returns all the additional
     search URLs to fire in parallel.
     Returns: Array of { url, engine } objects.
     ────────────────────────────────────────────────────────────── */
  function buildEnhancedQueries(query, page, pagesize) {
    const extras = [];

    // ─ Parse negation ─
    const { clean, negated } = parseNegation(query);
    const effectiveQuery = clean || query;

    // ─ Synonym-expanded queries ─
    const synonymQueries = expandQuery(effectiveQuery, 2);
    for (let i = 0; i < synonymQueries.length; i++) {
      const params = new URLSearchParams({
        order: 'desc', sort: 'relevance', site: Config.SITE,
        page, pagesize: Math.min(pagesize, 10), q: synonymQueries[i],
        filter: Config.SE_FILTER,
      });
      extras.push({ url: `${Config.SE_API}/search/advanced?${params}`, engine: 'synonym' });
    }

    // ─ Tag-based search ─
    const tags = inferTags(effectiveQuery, 3);
    if (tags.length > 0) {
      const params = new URLSearchParams({
        order: 'desc', sort: 'relevance', site: Config.SITE,
        page, pagesize: Math.min(pagesize, 10),
        tagged: tags.slice(0, 3).join(';'),
        filter: Config.SE_FILTER,
        intitle: effectiveQuery.split(/\s+/).slice(0, 3).join(' '),
      });
      extras.push({ url: `${Config.SE_API}/search?${params}`, engine: 'tagged' });
    }

    // ─ Decomposed sub-queries ─
    const subQueries = decomposeQuery(effectiveQuery);
    for (const sq of subQueries.slice(0, 1)) {
      const params = new URLSearchParams({
        order: 'desc', sort: 'relevance', site: Config.SITE,
        page: '1', pagesize: '5', q: sq,
        filter: Config.SE_FILTER,
      });
      extras.push({ url: `${Config.SE_API}/search/advanced?${params}`, engine: 'decompose' });
    }

    // ─ Phrase search (new) ─
    const phrases = extractPhrases(query);
    for (const ph of phrases.slice(0, 1)) {
      const params = new URLSearchParams({
        order: 'desc', sort: 'relevance', site: Config.SITE,
        page: '1', pagesize: '8', q: `"${ph}"`,
        filter: Config.SE_FILTER,
      });
      extras.push({ url: `${Config.SE_API}/search/advanced?${params}`, engine: 'phrase' });
    }

    // ─ Answer-content search (new) ─
    extras.push({ url: buildAnswerSearchUrl(effectiveQuery, page, Math.min(pagesize, 15)), engine: 'ans-body' });

    // ─ Cross-site search — MathOverflow (new) ─
    if (shouldCrossSearch(effectiveQuery)) {
      extras.push({ url: buildCrossSiteUrl(effectiveQuery, page, 8), engine: 'mathoverflow' });
    }

    // ─ Negation info (passed through for post-filtering) ─
    if (negated.length > 0) {
      extras._negated = negated;
    }

    return extras;
  }

  /* ──────────────────────────────────────────────────────────────
     POST-FILTER NEGATION — remove results containing negated terms
     ────────────────────────────────────────────────────────────── */
  function applyNegation(items, negatedTerms) {
    if (!negatedTerms || !negatedTerms.length) return items;
    return items.filter(item => {
      const text = ((item.title || '') + ' ' + (item.body || '') + ' ' + (item.excerpt || '')).toLowerCase();
      return !negatedTerms.some(n => text.includes(n));
    });
  }

  /* ──────────────────────────────────────────────────────────────
     UTILITY
     ────────────────────────────────────────────────────────────── */
  function _escReg(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* ── Public API ── */
  return {
    expandQuery,
    inferTags,
    decomposeQuery,
    fetchRelated,
    fetchLinked,
    scoreResult,
    rankResults,
    applyDisplaySort,
    buildEnhancedQueries,
    // New methods
    extractPhrases,
    parseNegation,
    applyNegation,
    fetchHotByTag,
    fetchTagWikis,
    fetchGoogleResults,
    fetchExternalMathResults,
    buildGoogleFallbackUrl,
    shouldCrossSearch,
    // Expose dictionaries for debugging
    _MATH_SYNONYMS: MATH_SYNONYMS,
    _TAG_MAP: TAG_MAP,
    _ADVANCED_KEYWORDS: ADVANCED_KEYWORDS,
  };

})();
