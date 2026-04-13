/* ================================================================
   search-autocorrect.js — Spell-check & typo correction for math search
   ================================================================
   Comprehensive autocorrect system covering:
     1. 500+ common math term misspellings → correct forms
     2. LaTeX command typo correction (\intt → \int, \frca → \frac)
     3. Levenshtein fuzzy matching for unknown words
     4. "Did you mean…?" UI suggestion
     5. Auto-fix before search for obvious typos
   ================================================================ */

const SearchAutocorrect = (() => {

  /* ════════════════════════════════════════════════════════════════
     SECTION 1: MATH VOCABULARY — Complete correct-spelling dictionary
     Used for fuzzy-match suggestions when no direct typo map exists
     ════════════════════════════════════════════════════════════════ */
  const MATH_VOCABULARY = [
    // ── Algebra ──
    'algebra', 'algebraic', 'equation', 'equations', 'polynomial', 'polynomials',
    'coefficient', 'coefficients', 'variable', 'variables', 'constant', 'constants',
    'expression', 'expressions', 'inequality', 'inequalities', 'linear', 'quadratic',
    'cubic', 'quartic', 'quintic', 'monomial', 'binomial', 'trinomial', 'factoring',
    'factorization', 'expansion', 'simplify', 'simplification', 'substitution',
    'elimination', 'commutative', 'associative', 'distributive', 'identity',
    'inverse', 'reciprocal', 'exponent', 'exponents', 'exponential', 'logarithm',
    'logarithms', 'logarithmic', 'radical', 'radicals', 'rationalize', 'rational',
    'irrational', 'imaginary', 'complex', 'conjugate', 'modulus', 'argument',
    'absolute', 'determinant', 'discriminant', 'remainder', 'quotient', 'dividend',
    'divisor', 'divisibility', 'coprime', 'relatively prime',

    // ── Calculus ──
    'calculus', 'derivative', 'derivatives', 'differentiation', 'differentiable',
    'differential', 'integral', 'integrals', 'integration', 'integrable',
    'antiderivative', 'antidifferentiation', 'limit', 'limits', 'continuity',
    'continuous', 'discontinuous', 'discontinuity', 'convergence', 'convergent',
    'divergence', 'divergent', 'series', 'sequence', 'sequences', 'summation',
    'partial', 'gradient', 'divergence', 'curl', 'laplacian', 'jacobian',
    'hessian', 'tangent', 'secant', 'normal', 'asymptote', 'asymptotic',
    'inflection', 'concave', 'concavity', 'convex', 'convexity', 'maximum',
    'minimum', 'extremum', 'extrema', 'optimization', 'critical', 'stationary',
    'monotone', 'monotonic', 'increasing', 'decreasing', 'bounded', 'unbounded',
    'supremum', 'infimum', 'accumulation', 'subsequence', 'cauchy',
    'riemann', 'lebesgue', 'improper', 'definite', 'indefinite', 'fundamental',
    'theorem', 'substitution', 'trigonometric', 'hyperbolic', 'parametric',
    'implicit', 'explicit', 'separable', 'exact',

    // ── Linear Algebra ──
    'matrix', 'matrices', 'vector', 'vectors', 'scalar', 'eigenvalue',
    'eigenvalues', 'eigenvector', 'eigenvectors', 'eigenspace', 'eigenfunction',
    'determinant', 'transpose', 'adjoint', 'adjugate', 'cofactor', 'minor',
    'rank', 'nullity', 'kernel', 'image', 'range', 'span', 'basis',
    'dimension', 'orthogonal', 'orthonormal', 'orthogonality', 'projection',
    'diagonalizable', 'diagonalization', 'triangular', 'symmetric', 'hermitian',
    'unitary', 'positive definite', 'negative definite', 'singular', 'nonsingular',
    'invertible', 'noninvertible', 'trace', 'inner product', 'dot product',
    'cross product', 'outer product', 'tensor', 'tensors', 'bilinear',
    'multilinear', 'subspace', 'quotient', 'isomorphism', 'isomorphic',
    'homomorphism', 'endomorphism', 'automorphism', 'nilpotent', 'idempotent',

    // ── Number Theory ──
    'prime', 'primes', 'primality', 'composite', 'factorial', 'fibonacci',
    'modular', 'modulus', 'congruence', 'congruent', 'residue', 'quadratic residue',
    'euler', 'totient', 'fermat', 'diophantine', 'pell', 'goldbach',
    'arithmetic', 'geometric', 'harmonic', 'perfect', 'abundant', 'deficient',
    'amicable', 'mersenne', 'twin primes', 'legendre', 'jacobi', 'kronecker',
    'multiplicative', 'additive', 'divisor function', 'number theory',
    'chinese remainder', 'wilson', 'primitive root', 'quadratic reciprocity',
    'gaussian', 'algebraic integer', 'transcendental', 'liouville',

    // ── Analysis ──
    'analysis', 'real analysis', 'complex analysis', 'functional analysis',
    'measure', 'measure theory', 'measurable', 'borel', 'sigma algebra',
    'topology', 'topological', 'open', 'closed', 'compact', 'compactness',
    'connected', 'connectedness', 'hausdorff', 'metric', 'metric space',
    'normed', 'banach', 'hilbert', 'sobolev', 'uniform', 'pointwise',
    'analytic', 'holomorphic', 'meromorphic', 'singularity', 'pole',
    'residue', 'contour', 'cauchy integral', 'laurent', 'taylor', 'maclaurin',
    'power series', 'radius of convergence', 'fourier', 'laplace', 'transform',
    'distribution', 'generalized function', 'schwartz', 'tempered',
    'equicontinuous', 'arzela-ascoli', 'stone-weierstrass', 'weierstrass',

    // ── Probability & Statistics ──
    'probability', 'statistics', 'statistical', 'random', 'stochastic',
    'expectation', 'expected value', 'variance', 'covariance', 'correlation',
    'standard deviation', 'distribution', 'normal', 'gaussian', 'poisson',
    'binomial', 'exponential', 'uniform', 'bernoulli', 'geometric',
    'hypergeometric', 'chi-squared', 'student', 'fisher', 'beta',
    'gamma', 'weibull', 'pareto', 'cauchy', 'markov', 'bayesian',
    'conditional', 'marginal', 'joint', 'independent', 'independence',
    'hypothesis', 'confidence', 'interval', 'regression', 'estimator',
    'likelihood', 'posterior', 'prior', 'combinatorics', 'permutation',
    'permutations', 'combination', 'combinations', 'counting', 'multinomial',

    // ── Geometry ──
    'geometry', 'geometric', 'euclidean', 'non-euclidean', 'hyperbolic',
    'spherical', 'projective', 'affine', 'differential geometry',
    'curvature', 'geodesic', 'manifold', 'manifolds', 'surface', 'surfaces',
    'area', 'volume', 'perimeter', 'circumference', 'diameter', 'radius',
    'angle', 'angles', 'triangle', 'triangles', 'rectangle', 'circle',
    'ellipse', 'parabola', 'hyperbola', 'conic', 'conics', 'polygon',
    'polyhedron', 'tetrahedron', 'sphere', 'cylinder', 'cone', 'torus',
    'parallel', 'perpendicular', 'collinear', 'coplanar', 'congruent',
    'similar', 'similarity', 'symmetry', 'rotation', 'reflection',
    'translation', 'dilation', 'transformation', 'isometry',

    // ── Discrete Math ──
    'graph', 'graphs', 'graph theory', 'vertex', 'vertices', 'edge', 'edges',
    'tree', 'trees', 'forest', 'cycle', 'path', 'hamiltonian', 'eulerian',
    'planar', 'bipartite', 'chromatic', 'coloring', 'matching', 'clique',
    'independent set', 'adjacency', 'incidence', 'degree', 'connected',
    'component', 'spanning', 'shortest path', 'minimum spanning', 'network',
    'boolean', 'logic', 'propositional', 'predicate', 'quantifier',
    'conjunction', 'disjunction', 'implication', 'negation', 'tautology',
    'contradiction', 'satisfiability', 'induction', 'recursion', 'recursive',
    'recurrence', 'generating function', 'partition', 'lattice',

    // ── Set Theory ──
    'set', 'sets', 'subset', 'superset', 'union', 'intersection',
    'complement', 'difference', 'symmetric difference', 'element',
    'membership', 'cardinality', 'countable', 'uncountable', 'finite',
    'infinite', 'cardinal', 'ordinal', 'transfinite', 'aleph',
    'continuum', 'axiom', 'axioms', 'zermelo', 'fraenkel', 'choice',
    'well-ordering', 'bijection', 'injection', 'surjection', 'function',
    'relation', 'equivalence', 'equivalence relation', 'partition',

    // ── Abstract Algebra ──
    'group', 'groups', 'group theory', 'subgroup', 'normal subgroup',
    'quotient group', 'coset', 'lagrange', 'sylow', 'abelian',
    'cyclic', 'dihedral', 'symmetric group', 'alternating group',
    'permutation group', 'homomorphism', 'isomorphism', 'automorphism',
    'ring', 'rings', 'ring theory', 'ideal', 'principal ideal',
    'prime ideal', 'maximal ideal', 'integral domain', 'field', 'fields',
    'field extension', 'galois', 'galois theory', 'solvable', 'simple',
    'module', 'modules', 'algebra', 'lie algebra', 'representation',
    'character', 'semisimple', 'noetherian', 'artinian',

    // ── Differential Equations ──
    'differential equation', 'ordinary', 'partial', 'ode', 'pde',
    'boundary', 'initial', 'boundary value', 'initial value',
    'existence', 'uniqueness', 'picard', 'lipschitz', 'gronwall',
    'sturm-liouville', 'green function', 'wronskian', 'characteristic',
    'homogeneous', 'nonhomogeneous', 'particular', 'complementary',
    'variation of parameters', 'method of undetermined coefficients',
    'laplace transform', 'fourier transform', 'power series solution',
    'frobenius', 'bessel', 'legendre polynomial', 'hermite', 'laguerre',
    'wave equation', 'heat equation', 'diffusion', 'poisson',
    'schrodinger', 'navier-stokes', 'elliptic', 'parabolic',

    // ── Trigonometric Functions ──
    'sine', 'cosine', 'tangent', 'cotangent', 'secant', 'cosecant',
    'arcsine', 'arccosine', 'arctangent', 'hyperbolic sine', 'hyperbolic cosine',
    'trigonometry', 'trigonometric', 'pythagorean', 'identity', 'identities',
    'angle addition', 'double angle', 'half angle', 'product-to-sum',

    // ── Misc Math Terms ──
    'proof', 'proofs', 'lemma', 'lemmas', 'corollary', 'proposition',
    'conjecture', 'hypothesis', 'definition', 'notation', 'formula',
    'formulas', 'formulae', 'algorithm', 'computation', 'numerical',
    'approximation', 'error', 'bound', 'estimate', 'inequality',
    'optimization', 'maximize', 'minimize', 'constraint', 'feasible',
    'necessary', 'sufficient', 'if and only if', 'iff', 'contrapositive',
    'counterexample', 'without loss of generality', 'wlog',
  ];

  /* ════════════════════════════════════════════════════════════════
     SECTION 2: TYPO → CORRECT MAP  (known common misspellings)
     ════════════════════════════════════════════════════════════════ */
  const TYPO_MAP = {
    // ── A ──
    'algbera': 'algebra', 'alebra': 'algebra', 'algebr': 'algebra',
    'algebric': 'algebraic', 'algabraic': 'algebraic', 'algebraci': 'algebraic',
    'algoritm': 'algorithm', 'algorith': 'algorithm', 'algorthm': 'algorithm',
    'algorythm': 'algorithm', 'alorithm': 'algorithm',
    'analsis': 'analysis', 'anaylsis': 'analysis', 'analyis': 'analysis',
    'anlysis': 'analysis', 'anlaysis': 'analysis',
    'analitic': 'analytic', 'analytc': 'analytic', 'anayltic': 'analytic',
    'antiderivitive': 'antiderivative', 'antiderivatie': 'antiderivative',
    'antidervative': 'antiderivative', 'antiderivaive': 'antiderivative',
    'aproximation': 'approximation', 'approximaton': 'approximation',
    'apporximation': 'approximation', 'aprroximation': 'approximation',
    'arithmatic': 'arithmetic', 'arithmetc': 'arithmetic', 'arithemtic': 'arithmetic',
    'assymptote': 'asymptote', 'asymtote': 'asymptote', 'asymptoe': 'asymptote',
    'asympote': 'asymptote', 'assymptotic': 'asymptotic', 'asymtotic': 'asymptotic',
    'asymptoic': 'asymptotic', 'associtaive': 'associative', 'assocative': 'associative',
    'axiom': 'axiom', 'axoim': 'axiom', 'axim': 'axiom',

    // ── B ──
    'bayseian': 'bayesian', 'baysian': 'bayesian', 'baesian': 'bayesian',
    'bijecion': 'bijection', 'biejction': 'bijection', 'bijcetion': 'bijection',
    'bilinera': 'bilinear', 'bilnear': 'bilinear',
    'binomal': 'binomial', 'bionmial': 'binomial', 'binomiel': 'binomial',
    'boundry': 'boundary', 'bondary': 'boundary', 'boudnary': 'boundary',
    'boundery': 'boundary',

    // ── C ──
    'calculas': 'calculus', 'calclus': 'calculus', 'calculis': 'calculus',
    'caluclus': 'calculus', 'calculsu': 'calculus', 'claculus': 'calculus',
    'cauhy': 'cauchy', 'cuachy': 'cauchy', 'cauhcy': 'cauchy',
    'cardinalty': 'cardinality', 'cardnality': 'cardinality',
    'coefficent': 'coefficient', 'coefficeint': 'coefficient',
    'coeffient': 'coefficient', 'coefficnet': 'coefficient', 'coeficient': 'coefficient',
    'combinatorcs': 'combinatorics', 'combinatroics': 'combinatorics',
    'combnatorics': 'combinatorics',
    'commuttive': 'commutative', 'commutaive': 'commutative', 'commuative': 'commutative',
    'compactnes': 'compactness', 'comapctness': 'compactness',
    'complment': 'complement', 'complemetn': 'complement', 'complemnet': 'complement',
    'congruance': 'congruence', 'congruense': 'congruence', 'congruecne': 'congruence',
    'conjugte': 'conjugate', 'conjuagte': 'conjugate', 'conjgate': 'conjugate',
    'continous': 'continuous', 'continious': 'continuous', 'continuos': 'continuous',
    'continus': 'continuous', 'coninuous': 'continuous', 'conitnuous': 'continuous',
    'contiunous': 'continuous',
    'continuty': 'continuity', 'continutiy': 'continuity', 'contiunity': 'continuity',
    'convergance': 'convergence', 'convergense': 'convergence', 'converegnce': 'convergence',
    'convergece': 'convergence', 'convrgence': 'convergence', 'convegrence': 'convergence',
    'convergent': 'convergent', 'convergnet': 'convergent',
    'corelation': 'correlation', 'correaltion': 'correlation', 'correlaton': 'correlation',
    'countabel': 'countable', 'countble': 'countable', 'coutable': 'countable',
    'covariance': 'covariance', 'covarince': 'covariance', 'covaraince': 'covariance',
    'curvatrue': 'curvature', 'curvture': 'curvature', 'curvtaure': 'curvature',

    // ── D ──
    'definite': 'definite', 'definte': 'definite', 'deifinite': 'definite',
    'defnite': 'definite',
    'deffinition': 'definition', 'defintion': 'definition', 'definiton': 'definition',
    'definiiton': 'definition', 'defnition': 'definition',
    'derivitive': 'derivative', 'derivatie': 'derivative', 'dervative': 'derivative',
    'deriviative': 'derivative', 'derivatve': 'derivative', 'derivaive': 'derivative',
    'derviative': 'derivative', 'deriative': 'derivative', 'derivativ': 'derivative',
    'derivtive': 'derivative', 'derivateive': 'derivative',
    'derivitives': 'derivatives', 'derivaties': 'derivatives', 'dervatives': 'derivatives',
    'derviatives': 'derivatives',
    'determiant': 'determinant', 'determinat': 'determinant', 'determianant': 'determinant',
    'determiannt': 'determinant', 'deteminant': 'determinant', 'detrminant': 'determinant',
    'diagonaliztion': 'diagonalization', 'diagonlization': 'diagonalization',
    'diagonalizabe': 'diagonalizable', 'diaginalizable': 'diagonalizable',
    'diferential': 'differential', 'differntial': 'differential', 'differntal': 'differential',
    'differetial': 'differential', 'differencial': 'differential',
    'diferentiation': 'differentiation', 'differentation': 'differentiation',
    'differntiation': 'differentiation',
    'diophantne': 'diophantine', 'diophantien': 'diophantine', 'diophatine': 'diophantine',
    'discontionuous': 'discontinuous', 'discontinous': 'discontinuous',
    'discontinuos': 'discontinuous',
    'discontinutiy': 'discontinuity', 'discontniuity': 'discontinuity',
    'discrimiant': 'discriminant', 'discriminat': 'discriminant', 'dsicriminant': 'discriminant',
    'distribtuive': 'distributive', 'distributve': 'distributive',
    'distributon': 'distribution', 'distribtuion': 'distribution', 'distrubution': 'distribution',
    'divergance': 'divergence', 'divergense': 'divergence', 'divregence': 'divergence',
    'divergece': 'divergence',
    'divisable': 'divisible', 'divisble': 'divisible', 'divislbe': 'divisible',
    'divisibilty': 'divisibility', 'divisbility': 'divisibility',

    // ── E ──
    'eiganvalue': 'eigenvalue', 'eigenvaleu': 'eigenvalue', 'eigenvlaue': 'eigenvalue',
    'eigenvaule': 'eigenvalue', 'eignvalue': 'eigenvalue', 'eignevalue': 'eigenvalue',
    'eignvalue': 'eigenvalue', 'eigenvale': 'eigenvalue', 'eigenalue': 'eigenvalue',
    'eiganvalues': 'eigenvalues', 'eigenvaleus': 'eigenvalues', 'eigenvlaues': 'eigenvalues',
    'eiganvector': 'eigenvector', 'eigenvctor': 'eigenvector', 'eigenvectr': 'eigenvector',
    'eigenvectro': 'eigenvector', 'eigenvecor': 'eigenvector',
    'eilpse': 'ellipse', 'elipse': 'ellipse', 'ellispe': 'ellipse', 'ellpise': 'ellipse',
    'equaion': 'equation', 'equaton': 'equation', 'eqaution': 'equation',
    'euqation': 'equation', 'equatin': 'equation', 'euation': 'equation',
    'equaions': 'equations', 'equatons': 'equations',
    'equvialence': 'equivalence', 'equivalnce': 'equivalence', 'euqivalence': 'equivalence',
    'euclidean': 'euclidean', 'euclidian': 'euclidean', 'eucldiean': 'euclidean',
    'existance': 'existence', 'existnce': 'existence', 'existece': 'existence',
    'expnonent': 'exponent', 'exponet': 'exponent', 'expoent': 'exponent',
    'exponetial': 'exponential', 'expoenntial': 'exponential', 'exponentail': 'exponential',
    'expresion': 'expression', 'exression': 'expression', 'expresssion': 'expression',

    // ── F ──
    'factoriztion': 'factorization', 'factorizaion': 'factorization',
    'factorazation': 'factorization', 'factorizaton': 'factorization',
    'fibonaci': 'fibonacci', 'fibbonacci': 'fibonacci', 'fibonnaci': 'fibonacci',
    'fibonacci': 'fibonacci', 'fobonacci': 'fibonacci',
    'formla': 'formula', 'fromula': 'formula', 'fomula': 'formula', 'forumla': 'formula',
    'fouier': 'fourier', 'fourir': 'fourier', 'fouirer': 'fourier', 'fourrier': 'fourier',
    'fucntion': 'function', 'funcion': 'function', 'funtion': 'function',
    'funciton': 'function', 'fnction': 'function', 'fuction': 'function',
    'fucntions': 'functions', 'funcions': 'functions', 'funtions': 'functions',
    'fundemental': 'fundamental', 'fundamnetal': 'fundamental', 'fundamentl': 'fundamental',

    // ── G ──
    'galios': 'galois', 'gaolis': 'galois', 'galoi': 'galois',
    'gaussain': 'gaussian', 'guassian': 'gaussian', 'gaussian': 'gaussian',
    'geometrc': 'geometric', 'geoemtric': 'geometric', 'geometirc': 'geometric',
    'goemetry': 'geometry', 'geomety': 'geometry', 'geomerty': 'geometry',
    'gradiant': 'gradient', 'gradent': 'gradient', 'gradeint': 'gradient',
    'graident': 'gradient',

    // ── H ──
    'hamiltonan': 'hamiltonian', 'hamiltoninan': 'hamiltonian',
    'harmoinc': 'harmonic', 'harmonci': 'harmonic',
    'hermitain': 'hermitian', 'hermition': 'hermitian', 'hermitin': 'hermitian',
    'hilbret': 'hilbert', 'hilbet': 'hilbert',
    'holomorphc': 'holomorphic', 'holomoprhic': 'holomorphic',
    'homegeneous': 'homogeneous', 'homogenous': 'homogeneous', 'homogeneos': 'homogeneous',
    'homogenious': 'homogeneous',
    'homomrphism': 'homomorphism', 'homomorphsim': 'homomorphism',
    'hyperbolc': 'hyperbolic', 'hyperbloic': 'hyperbolic',
    'hypotheis': 'hypothesis', 'hypothsis': 'hypothesis', 'hypotheiss': 'hypothesis',

    // ── I ──
    'idempotnet': 'idempotent', 'ideompotent': 'idempotent',
    'identiy': 'identity', 'idenitty': 'identity', 'idenity': 'identity',
    'indcution': 'induction', 'inducton': 'induction', 'indution': 'induction',
    'ineqaulity': 'inequality', 'inequailty': 'inequality', 'ineuality': 'inequality',
    'inequlaity': 'inequality', 'ineuqality': 'inequality',
    'infimun': 'infimum', 'infimm': 'infimum', 'inifmum': 'infimum',
    'inifnite': 'infinite', 'infinte': 'infinite', 'infnite': 'infinite',
    'injecion': 'injection', 'injecton': 'injection', 'ijection': 'injection',
    'integal': 'integral', 'integrl': 'integral', 'intgral': 'integral',
    'intregal': 'integral', 'integeral': 'integral', 'integreal': 'integral',
    'intergal': 'integral', 'intergral': 'integral', 'inegral': 'integral',
    'integras': 'integrals', 'integrlas': 'integrals', 'intergals': 'integrals',
    'integraton': 'integration', 'integation': 'integration', 'intgration': 'integration',
    'intergration': 'integration',
    'intresection': 'intersection', 'intersecton': 'intersection',
    'inversable': 'invertible', 'invertble': 'invertible', 'inveritble': 'invertible',
    'irational': 'irrational', 'irratinal': 'irrational', 'irratonal': 'irrational',
    'isomoprhism': 'isomorphism', 'isomrphism': 'isomorphism', 'isomorphsim': 'isomorphism',

    // ── J ──
    'jacobain': 'jacobian', 'jacobina': 'jacobian', 'jaobian': 'jacobian',

    // ── K ──
    'kernal': 'kernel', 'kenrel': 'kernel', 'krnel': 'kernel',

    // ── L ──
    'lagange': 'lagrange', 'lagrang': 'lagrange', 'lagrnage': 'lagrange',
    'laplce': 'laplace', 'lpalace': 'laplace', 'lapalce': 'laplace',
    'laplacain': 'laplacian', 'lapalcian': 'laplacian',
    'laurnet': 'laurent', 'laruent': 'laurent',
    'lebesgeu': 'lebesgue', 'lebesque': 'lebesgue', 'lesbegue': 'lebesgue',
    'legednre': 'legendre', 'legrende': 'legendre',
    'liniear': 'linear', 'lnear': 'linear', 'linaer': 'linear', 'linera': 'linear',
    'lipchitz': 'lipschitz', 'lipshitz': 'lipschitz', 'libschitz': 'lipschitz',
    'logarithim': 'logarithm', 'logaritm': 'logarithm', 'logartihm': 'logarithm',
    'logarthm': 'logarithm', 'logrithm': 'logarithm', 'logarithm': 'logarithm',
    'logaritmic': 'logarithmic', 'logarithimc': 'logarithmic', 'logarthmic': 'logarithmic',

    // ── M ──
    'maclauirn': 'maclaurin', 'mclaurin': 'maclaurin', 'maclaurn': 'maclaurin',
    'maniflod': 'manifold', 'manifod': 'manifold', 'maniflold': 'manifold',
    'matirx': 'matrix', 'matrx': 'matrix', 'amtrix': 'matrix', 'matix': 'matrix',
    'matricies': 'matrices', 'matrcies': 'matrices', 'matrixes': 'matrices',
    'measurabel': 'measurable', 'mesurable': 'measurable', 'measuable': 'measurable',
    'meromorphc': 'meromorphic', 'meormorphic': 'meromorphic',
    'modluar': 'modular', 'modualar': 'modular', 'modulra': 'modular',
    'monotone': 'monotone', 'monoton': 'monotone',
    'monotoic': 'monotonic', 'monotoinc': 'monotonic', 'monontic': 'monotonic',
    'mulitplication': 'multiplication', 'multiplicaton': 'multiplication',
    'multiplicaive': 'multiplicative', 'mutliplicative': 'multiplicative',

    // ── N ──
    'nilpotnet': 'nilpotent', 'nilopotent': 'nilpotent',
    'noetherian': 'noetherian', 'noethrian': 'noetherian',
    'nonhomegeneous': 'nonhomogeneous', 'nonhomogenous': 'nonhomogeneous',
    'nromal': 'normal', 'noraml': 'normal', 'norml': 'normal',
    'numeriacl': 'numerical', 'numercial': 'numerical', 'numiercal': 'numerical',

    // ── O ──
    'optimizaton': 'optimization', 'optimzation': 'optimization',
    'optmization': 'optimization', 'opitmization': 'optimization',
    'ordianry': 'ordinary', 'ordinray': 'ordinary', 'oridnary': 'ordinary',
    'orthognal': 'orthogonal', 'orthagonal': 'orthogonal', 'orthoganal': 'orthogonal',
    'orthonrmal': 'orthonormal', 'orthanormal': 'orthonormal',

    // ── P ──
    'paraboloa': 'parabola', 'parbola': 'parabola', 'paraobla': 'parabola',
    'parametrc': 'parametric', 'paramteric': 'parametric', 'paramatric': 'parametric',
    'parital': 'partial', 'partail': 'partial', 'paritial': 'partial', 'partiel': 'partial',
    'partitoin': 'partition', 'partiton': 'partition', 'parittion': 'partition',
    'permutaion': 'permutation', 'permutaton': 'permutation', 'permutatoin': 'permutation',
    'perependicular': 'perpendicular', 'perpindicular': 'perpendicular',
    'perpendciular': 'perpendicular',
    'poisson': 'poisson', 'poissson': 'poisson', 'posison': 'poisson',
    'polynomail': 'polynomial', 'polynomila': 'polynomial', 'polynominal': 'polynomial',
    'polynoial': 'polynomial', 'plynomial': 'polynomial', 'poylnomial': 'polynomial',
    'postive': 'positive', 'positve': 'positive', 'positvie': 'positive',
    'priamality': 'primality', 'pirmality': 'primality',
    'probabilty': 'probability', 'probablity': 'probability', 'probabiilty': 'probability',
    'pobability': 'probability', 'probabiliy': 'probability',
    'projecton': 'projection', 'porjection': 'projection', 'projeciton': 'projection',
    'propsition': 'proposition', 'propostion': 'proposition', 'prposition': 'proposition',
    'pythagorean': 'pythagorean', 'pythagorian': 'pythagorean', 'pythaogrean': 'pythagorean',

    // ── Q ──
    'quadartic': 'quadratic', 'quadrtic': 'quadratic', 'quardatic': 'quadratic',
    'qudratic': 'quadratic', 'quadratci': 'quadratic',
    'quotent': 'quotient', 'quotiant': 'quotient', 'quoteint': 'quotient',

    // ── R ──
    'rationl': 'rational', 'ratonal': 'rational', 'ratioanl': 'rational',
    'rationlize': 'rationalize', 'ratonalize': 'rationalize',
    'recurence': 'recurrence', 'recurrece': 'recurrence', 'recurrance': 'recurrence',
    'recusrion': 'recursion', 'recurson': 'recursion', 'recursoin': 'recursion',
    'recursve': 'recursive', 'recurisve': 'recursive', 'recusvie': 'recursive',
    'regresson': 'regression', 'regrssion': 'regression', 'regresion': 'regression',
    'reiman': 'riemann', 'reimann': 'riemann', 'rieman': 'riemann', 'reemann': 'riemann',
    'remaiinder': 'remainder', 'remiander': 'remainder', 'remaindr': 'remainder',
    'reprsentation': 'representation', 'represntation': 'representation',
    'resideu': 'residue', 'reisdue': 'residue', 'resiude': 'residue',
    'roation': 'rotation', 'rotaiton': 'rotation', 'rotatoin': 'rotation',

    // ── S ──
    'scaler': 'scalar', 'scalr': 'scalar', 'sclar': 'scalar',
    'schrodigner': 'schrodinger', 'shrodinger': 'schrodinger',
    'seperabl': 'separable', 'separabel': 'separable', 'seprable': 'separable',
    'sequnce': 'sequence', 'seqeunce': 'sequence', 'sequecne': 'sequence',
    'seqeuence': 'sequence', 'seqence': 'sequence',
    'sequnces': 'sequences', 'seqeunces': 'sequences',
    'seires': 'series', 'sereies': 'series', 'sereis': 'series', 'sries': 'series',
    'sigularity': 'singularity', 'singualrity': 'singularity', 'singlarity': 'singularity',
    'simplificaton': 'simplification', 'simplificaiton': 'simplification',
    'soloution': 'solution', 'soluton': 'solution', 'soultion': 'solution',
    'soluion': 'solution',
    'solvabel': 'solvable', 'solvble': 'solvable',
    'statistcs': 'statistics', 'statstics': 'statistics', 'statistics': 'statistics',
    'stochastc': 'stochastic', 'stochasitc': 'stochastic',
    'subgruop': 'subgroup', 'subgourp': 'subgroup', 'subgrop': 'subgroup',
    'subsequnce': 'subsequence', 'subseuqence': 'subsequence',
    'subsapce': 'subspace', 'subpsace': 'subspace', 'subspac': 'subspace',
    'substition': 'substitution', 'substituton': 'substitution', 'subsitution': 'substitution',
    'sumation': 'summation', 'summaton': 'summation', 'summmation': 'summation',
    'supremun': 'supremum', 'suprmum': 'supremum', 'surpremum': 'supremum',
    'surjection': 'surjection', 'surjecion': 'surjection',
    'symetric': 'symmetric', 'symmetrc': 'symmetric', 'symettric': 'symmetric',
    'symetry': 'symmetry', 'symmety': 'symmetry', 'symettry': 'symmetry',

    // ── T ──
    'taylro': 'taylor', 'tayor': 'taylor', 'tayolr': 'taylor',
    'theoram': 'theorem', 'theorm': 'theorem', 'theorme': 'theorem',
    'thoerem': 'theorem', 'tehorem': 'theorem', 'theoreem': 'theorem',
    'topolgoy': 'topology', 'topolgy': 'topology', 'topolog': 'topology',
    'topologcal': 'topological', 'topolgoical': 'topological',
    'transcedental': 'transcendental', 'transcendntal': 'transcendental',
    'transfrom': 'transform', 'trasnform': 'transform', 'transfrm': 'transform',
    'transfroms': 'transforms', 'trasnforms': 'transforms',
    'transformaton': 'transformation', 'trasnformation': 'transformation',
    'transofrmation': 'transformation',
    'translaion': 'translation', 'translaiton': 'translation',
    'traingular': 'triangular', 'triangualr': 'triangular',
    'triange': 'triangle', 'triangel': 'triangle', 'traingle': 'triangle',
    'trigonometirc': 'trigonometric', 'trigonometrc': 'trigonometric',
    'trigonmetric': 'trigonometric', 'trig': 'trigonometric',
    'trignometry': 'trigonometry', 'trigonometrty': 'trigonometry',
    'trigonmetry': 'trigonometry',

    // ── U ──
    'uncountabel': 'uncountable', 'uncoutnable': 'uncountable',
    'unifrom': 'uniform', 'unifrm': 'uniform', 'unfiorm': 'uniform',
    'uniquness': 'uniqueness', 'uniqeness': 'uniqueness', 'uniquness': 'uniqueness',
    'unitray': 'unitary', 'untiary': 'unitary',

    // ── V ──
    'vairable': 'variable', 'varialbe': 'variable', 'varaible': 'variable',
    'variabel': 'variable', 'vraible': 'variable',
    'varibles': 'variables', 'varaibles': 'variables', 'variabels': 'variables',
    'varianace': 'variance', 'varince': 'variance', 'varaince': 'variance',
    'variaton': 'variation', 'variaion': 'variation',
    'vecotr': 'vector', 'vectr': 'vector', 'vectro': 'vector', 'vcector': 'vector',
    'vecotrs': 'vectors', 'vectros': 'vectors',

    // ── W ──
    'weierstrss': 'weierstrass', 'weierstras': 'weierstrass', 'wieerstrass': 'weierstrass',
    'wronskain': 'wronskian', 'wronksian': 'wronskian', 'wronsakin': 'wronskian',

    // ── Z ──
    'zermelo': 'zermelo', 'zermeolo': 'zermelo',
  };

  /* ════════════════════════════════════════════════════════════════
     SECTION 3: LATEX COMMAND TYPO MAP
     Covers misspelled LaTeX commands — the command slash included
     ════════════════════════════════════════════════════════════════ */
  const LATEX_TYPO_MAP = {
    // ── Core structures ──
    '\\frc': '\\frac', '\\frca': '\\frac', '\\frac': '\\frac',
    '\\farc': '\\frac', '\\frc': '\\frac', '\\rfac': '\\frac',
    '\\frak': '\\frac', '\\frc{': '\\frac{', '\\frqc': '\\frac',
    '\\intt': '\\int', '\\itn': '\\int', '\\nit': '\\int',
    '\\iny': '\\int', '\\Int': '\\int', '\\ni': '\\int',
    '\\smu': '\\sum', '\\usm': '\\sum', '\\summ': '\\sum',
    '\\suum': '\\sum', '\\um': '\\sum',
    '\\prd': '\\prod', '\\prod': '\\prod', '\\rpod': '\\prod',
    '\\porduct': '\\prod', '\\prodd': '\\prod',
    '\\sqr': '\\sqrt', '\\sqt': '\\sqrt', '\\sqrot': '\\sqrt',
    '\\srt': '\\sqrt', '\\squrt': '\\sqrt', '\\quart': '\\sqrt',
    '\\lim': '\\lim', '\\limt': '\\lim', '\\lmi': '\\lim',
    '\\ilm': '\\lim', '\\limm': '\\lim',
    '\\bino': '\\binom', '\\binmo': '\\binom', '\\bionm': '\\binom',
    '\\biom': '\\binom',

    // ── Trig functions ──
    '\\sni': '\\sin', '\\siin': '\\sin', '\\isn': '\\sin', '\\sine': '\\sin',
    '\\cosn': '\\cos', '\\cso': '\\cos', '\\cos': '\\cos', '\\cosine': '\\cos',
    '\\tna': '\\tan', '\\taan': '\\tan', '\\atn': '\\tan', '\\tangent': '\\tan',
    '\\cot': '\\cot', '\\cto': '\\cot', '\\cotangent': '\\cot',
    '\\sce': '\\sec', '\\sce': '\\sec', '\\secant': '\\sec',
    '\\ccs': '\\csc', '\\scsc': '\\csc', '\\cosecant': '\\csc',

    // ── Inverse trig ──
    '\\arcsni': '\\arcsin', '\\arcsni': '\\arcsin', '\\arcisn': '\\arcsin',
    '\\arccso': '\\arccos', '\\arccosn': '\\arccos',
    '\\arctna': '\\arctan', '\\arctaan': '\\arctan',

    // ── Hyperbolic ──
    '\\snhi': '\\sinh', '\\sinnh': '\\sinh',
    '\\csoh': '\\cosh', '\\cosh': '\\cosh',
    '\\tnah': '\\tanh', '\\tannh': '\\tanh',

    // ── Log/Exp ──
    '\\ogl': '\\log', '\\lgo': '\\log', '\\logg': '\\log',
    '\\nl': '\\ln', '\\lnn': '\\ln', '\\nln': '\\ln',
    '\\xep': '\\exp', '\\epx': '\\exp', '\\expp': '\\exp',

    // ── Greek letters ──
    '\\aplha': '\\alpha', '\\alph': '\\alpha', '\\alhpa': '\\alpha',
    '\\alpah': '\\alpha', '\\lapha': '\\alpha',
    '\\bta': '\\beta', '\\btea': '\\beta', '\\batea': '\\beta', '\\ebta': '\\beta',
    '\\gmma': '\\gamma', '\\gamm': '\\gamma', '\\gaamma': '\\gamma',
    '\\Gmma': '\\Gamma', '\\Gamm': '\\Gamma',
    '\\dleta': '\\delta', '\\delt': '\\delta', '\\detla': '\\delta',
    '\\Dleta': '\\Delta', '\\Detla': '\\Delta',
    '\\epsioln': '\\epsilon', '\\epsiln': '\\epsilon', '\\espilon': '\\epsilon',
    '\\epslion': '\\epsilon', '\\epslon': '\\epsilon',
    '\\varepsiln': '\\varepsilon', '\\varepslion': '\\varepsilon',
    '\\zta': '\\zeta', '\\ztea': '\\zeta', '\\zetaa': '\\zeta',
    '\\tea': '\\eta', '\\eeta': '\\eta',
    '\\thta': '\\theta', '\\thtea': '\\theta', '\\tehta': '\\theta',
    '\\theeta': '\\theta', '\\tetha': '\\theta',
    '\\Thta': '\\Theta', '\\Tehta': '\\Theta',
    '\\iot': '\\iota', '\\ioa': '\\iota',
    '\\kapa': '\\kappa', '\\kapppa': '\\kappa', '\\kppa': '\\kappa',
    '\\lamda': '\\lambda', '\\lmabda': '\\lambda', '\\labmda': '\\lambda',
    '\\lamdba': '\\lambda', '\\lamba': '\\lambda', '\\lambad': '\\lambda',
    '\\Lamda': '\\Lambda', '\\Lmabda': '\\Lambda',
    '\\muu': '\\mu', '\\um': '\\mu',
    '\\nuu': '\\nu', '\\un': '\\nu',
    '\\xii': '\\xi', '\\ix': '\\xi',
    '\\Xii': '\\Xi',
    '\\pii': '\\pi', '\\ip': '\\pi',
    '\\Pii': '\\Pi',
    '\\roh': '\\rho', '\\roh': '\\rho', '\\hro': '\\rho',
    '\\sgima': '\\sigma', '\\sigam': '\\sigma', '\\simga': '\\sigma',
    '\\sigm': '\\sigma',
    '\\Sgima': '\\Sigma', '\\Sigam': '\\Sigma', '\\Simga': '\\Sigma',
    '\\tua': '\\tau', '\\atu': '\\tau', '\\tauu': '\\tau',
    '\\uplison': '\\upsilon', '\\upisilon': '\\upsilon',
    '\\phii': '\\phi', '\\pih': '\\phi',
    '\\Phii': '\\Phi',
    '\\varphii': '\\varphi',
    '\\chi': '\\chi', '\\cih': '\\chi', '\\hci': '\\chi',
    '\\pis': '\\psi', '\\pis': '\\psi', '\\spi': '\\psi',
    '\\Pis': '\\Psi', '\\Spi': '\\Psi',
    '\\omaeg': '\\omega', '\\omeg': '\\omega', '\\oegma': '\\omega',
    '\\omeag': '\\omega',
    '\\Omaeg': '\\Omega', '\\Omeg': '\\Omega',

    // ── Relations & operators ──
    '\\leqq': '\\leq', '\\leqq': '\\leq', '\\leeq': '\\leq',
    '\\geqq': '\\geq', '\\geeq': '\\geq',
    '\\neqq': '\\neq', '\\neeq': '\\neq', '\\enq': '\\neq',
    '\\approxx': '\\approx', '\\apporx': '\\approx', '\\aprox': '\\approx',
    '\\equvi': '\\equiv', '\\eqiuv': '\\equiv', '\\euqiv': '\\equiv',
    '\\sbuset': '\\subset', '\\subet': '\\subset', '\\subste': '\\subset',
    '\\supseet': '\\supset', '\\supste': '\\supset',
    '\\ni': '\\in', '\\iin': '\\in',
    '\\notin': '\\notin', '\\noti': '\\notin',
    '\\cupp': '\\cup', '\\capp': '\\cap',
    '\\forlal': '\\forall', '\\frall': '\\forall', '\\forll': '\\forall',
    '\\forral': '\\forall',
    '\\exsits': '\\exists', '\\exisst': '\\exists', '\\exsts': '\\exists',
    '\\eixsts': '\\exists',
    '\\infyt': '\\infty', '\\inft': '\\infty', '\\infity': '\\infty',
    '\\ifnty': '\\infty', '\\infty': '\\infty', '\\inftty': '\\infty',
    '\\infinty': '\\infty', '\\inifinty': '\\infty',

    // ── Arrows ──
    '\\rightarow': '\\rightarrow', '\\rigtharrow': '\\rightarrow',
    '\\rightarrwo': '\\rightarrow',
    '\\leftarow': '\\leftarrow', '\\letfarrow': '\\leftarrow',
    '\\Rightarow': '\\Rightarrow', '\\Rigtharrow': '\\Rightarrow',
    '\\Leftarow': '\\Leftarrow',
    '\\too': '\\to', '\\ot': '\\to',

    // ── Spacing & formatting ──
    '\\marhm': '\\mathrm', '\\mathm': '\\mathrm', '\\matrhm': '\\mathrm',
    '\\mathb': '\\mathbb', '\\mathbbb': '\\mathbb', '\\amthbb': '\\mathbb',
    '\\mahbb': '\\mathbb',
    '\\mathbf': '\\mathbf', '\\mathfb': '\\mathbf',
    '\\mathca': '\\mathcal', '\\mathcla': '\\mathcal', '\\amthcal': '\\mathcal',
    '\\textt': '\\text', '\\tetx': '\\text', '\\txet': '\\text',
    '\\overlin': '\\overline', '\\overlien': '\\overline', '\\oveline': '\\overline',
    '\\underlin': '\\underline', '\\underlien': '\\underline',

    // ── Accents & decorations ──
    '\\hat': '\\hat', '\\hta': '\\hat',
    '\\bar': '\\bar', '\\abr': '\\bar',
    '\\vec': '\\vec', '\\vce': '\\vec',
    '\\tilde': '\\tilde', '\\tildd': '\\tilde', '\\tiled': '\\tilde',
    '\\dot': '\\dot', '\\doot': '\\dot',
    '\\ddot': '\\ddot',

    // ── Environments ──
    '\\bigin': '\\begin', '\\begni': '\\begin', '\\bgin': '\\begin',
    '\\beigin': '\\begin',
    '\\nd': '\\end', '\\ned': '\\end', '\\edn': '\\end',

    // ── Misc ──
    '\\parta': '\\partial', '\\partail': '\\partial', '\\paritial': '\\partial',
    '\\pratial': '\\partial', '\\partila': '\\partial',
    '\\nabal': '\\nabla', '\\nalba': '\\nabla', '\\nabals': '\\nabla',
    '\\cdto': '\\cdot', '\\cdoot': '\\cdot', '\\cdt': '\\cdot',
    '\\tiems': '\\times', '\\tiems': '\\times', '\\tims': '\\times',
    '\\times': '\\times',
    '\\ldtos': '\\ldots', '\\ldos': '\\ldots', '\\ldsots': '\\ldots',
    '\\cdtos': '\\cdots', '\\cdos': '\\cdots',
  };

  /* ════════════════════════════════════════════════════════════════
     SECTION 4: LEVENSHTEIN DISTANCE — fuzzy matching engine
     ════════════════════════════════════════════════════════════════ */

  /** Compute Levenshtein edit distance between two strings */
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    // Use two-row optimization for memory efficiency
    let prev = new Array(b.length + 1);
    let curr = new Array(b.length + 1);

    for (let j = 0; j <= b.length; j++) prev[j] = j;

    for (let i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,       // deletion
          curr[j - 1] + 1,   // insertion
          prev[j - 1] + cost  // substitution
        );
      }
      [prev, curr] = [curr, prev];
    }
    return prev[b.length];
  }

  /**
   * Find the closest match in a word list using Levenshtein distance.
   * Returns { word, distance } or null if nothing is close enough.
   * maxDistance: max edits to consider (default: ~30% of word length)
   */
  function findClosest(word, wordList, maxDist) {
    const max = maxDist || Math.max(1, Math.floor(word.length * 0.35));
    let best = null;
    let bestDist = max + 1;

    for (const candidate of wordList) {
      // Quick length filter — skip if length difference > max
      if (Math.abs(candidate.length - word.length) > max) continue;

      const dist = levenshtein(word.toLowerCase(), candidate.toLowerCase());
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
        if (dist === 0) break; // exact match
      }
    }

    return bestDist <= max ? { word: best, distance: bestDist } : null;
  }

  /* ════════════════════════════════════════════════════════════════
     SECTION 5: AUTOCORRECT ENGINE
     ════════════════════════════════════════════════════════════════ */

  /**
   * Correct a single English word.
   * 1. Check direct typo map
   * 2. Fuzzy match against vocabulary
   * Returns { original, corrected, method } or null if no correction
   */
  function correctWord(word) {
    if (!word || word.length < 3) return null;
    const lower = word.toLowerCase();

    // 1. Direct typo map lookup
    if (TYPO_MAP[lower]) {
      const fixed = TYPO_MAP[lower];
      if (fixed !== lower) {
        // Preserve original casing style
        const corrected = word[0] === word[0].toUpperCase()
          ? fixed[0].toUpperCase() + fixed.slice(1)
          : fixed;
        return { original: word, corrected, method: 'typo-map' };
      }
    }

    // 2. Skip if it's already a valid vocabulary word
    if (MATH_VOCABULARY.includes(lower)) return null;

    // 3. Fuzzy match
    const match = findClosest(lower, MATH_VOCABULARY);
    if (match && match.distance > 0 && match.distance <= Math.max(1, Math.floor(lower.length * 0.3))) {
      const corrected = word[0] === word[0].toUpperCase()
        ? match.word[0].toUpperCase() + match.word.slice(1)
        : match.word;
      return { original: word, corrected, method: 'fuzzy', distance: match.distance };
    }

    return null;
  }

  /**
   * Correct LaTeX commands in a string.
   * Finds misspelled \commands and replaces them.
   */
  function correctLatex(tex) {
    if (!tex) return { text: tex, corrections: [] };
    const corrections = [];

    // Find all \command sequences
    const corrected = tex.replace(/\\[a-zA-Z]+/g, (cmd) => {
      if (LATEX_TYPO_MAP[cmd] && LATEX_TYPO_MAP[cmd] !== cmd) {
        corrections.push({ original: cmd, corrected: LATEX_TYPO_MAP[cmd], method: 'latex-typo' });
        return LATEX_TYPO_MAP[cmd];
      }
      return cmd;
    });

    return { text: corrected, corrections };
  }

  /**
   * Correct a full text search query (English words).
   * Splits into words, corrects each, reassembles.
   */
  function correctQuery(query) {
    if (!query) return { text: query, corrections: [] };
    const corrections = [];
    const words = query.split(/(\s+)/); // keep whitespace

    const corrected = words.map(w => {
      if (/^\s+$/.test(w)) return w;           // whitespace — keep
      if (/^[^a-zA-Z]+$/.test(w)) return w;    // numbers/symbols — keep
      if (w.startsWith('\\')) return w;         // LaTeX command — skip
      if (w.length < 3) return w;               // too short — skip

      const fix = correctWord(w);
      if (fix) {
        corrections.push(fix);
        return fix.corrected;
      }
      return w;
    }).join('');

    return { text: corrected, corrections };
  }

  /**
   * Full autocorrect — handles both LaTeX and English text.
   * Use for LaTeX search: corrects commands + keywords.
   * Use for text search: corrects English words.
   */
  function autocorrect(text, mode) {
    if (!text || !text.trim()) return { text, corrections: [], changed: false };

    let allCorrections = [];
    let result = text;

    if (mode === 'latex') {
      // Fix LaTeX commands
      const latexResult = correctLatex(result);
      result = latexResult.text;
      allCorrections.push(...latexResult.corrections);
    }

    // Fix English words (works for both modes)
    const queryResult = correctQuery(result);
    result = queryResult.text;
    allCorrections.push(...queryResult.corrections);

    return {
      text: result,
      corrections: allCorrections,
      changed: allCorrections.length > 0,
    };
  }

  /* ════════════════════════════════════════════════════════════════
     SECTION 6: "DID YOU MEAN?" UI
     ════════════════════════════════════════════════════════════════ */

  /**
   * Show a "Did you mean: X?" banner above results.
   * Returns a DOM element or null if no corrections.
   */
  function createSuggestionBanner(original, corrections, onAccept) {
    if (!corrections.length) return null;

    const banner = document.createElement('div');
    banner.className = 'autocorrect-banner';

    const correctionsText = corrections
      .map(c => `<strong>${c.corrected}</strong>`)
      .join(', ');

    const originalWords = corrections
      .map(c => `<s>${c.original}</s>`)
      .join(', ');

    banner.innerHTML = `
      <span class="autocorrect-icon">&#9998;</span>
      <span>Showing results for ${correctionsText}
        <span class="autocorrect-original">(instead of ${originalWords})</span>
      </span>
      <button class="autocorrect-undo" title="Search for the original instead">Search original</button>
    `;

    const undoBtn = banner.querySelector('.autocorrect-undo');
    if (undoBtn && onAccept) {
      undoBtn.addEventListener('click', () => {
        onAccept(original);
        banner.remove();
      });
    }

    return banner;
  }

  /* ════════════════════════════════════════════════════════════════
     SECTION 7: MATH EQUIVALENCE EXPANSION
     Maps common text/LaTeX terms to equivalent forms so the search
     engine can broaden queries intelligently.
     ════════════════════════════════════════════════════════════════ */

  /**
   * Bi-directional equivalence groups.
   * Each group: { terms: [...all text/LaTeX forms], label: 'description' }
   * When any term in a group is found, the others become synonyms.
   */
  const MATH_EQUIVALENCES = [
    // ── Logarithms ──
    { terms: ['log', 'ln', '\\ln', '\\log', 'logarithm', 'logarithmic', 'natural log'], label: 'logarithm' },

    // ── Trigonometric ──
    { terms: ['sin', '\\sin', 'sine'],                       label: 'sine' },
    { terms: ['cos', '\\cos', 'cosine'],                     label: 'cosine' },
    { terms: ['tan', '\\tan', 'tangent'],                    label: 'tangent' },
    { terms: ['cot', '\\cot', 'cotangent'],                  label: 'cotangent' },
    { terms: ['sec', '\\sec', 'secant'],                     label: 'secant' },
    { terms: ['csc', '\\csc', 'cosecant'],                   label: 'cosecant' },
    { terms: ['arcsin', '\\arcsin', 'asin', 'inverse sine'], label: 'arcsin' },
    { terms: ['arccos', '\\arccos', 'acos', 'inverse cosine'], label: 'arccos' },
    { terms: ['arctan', '\\arctan', 'atan', 'inverse tangent'], label: 'arctan' },

    // ── Hyperbolic ──
    { terms: ['sinh', '\\sinh', 'hyperbolic sine'],          label: 'sinh' },
    { terms: ['cosh', '\\cosh', 'hyperbolic cosine'],        label: 'cosh' },
    { terms: ['tanh', '\\tanh', 'hyperbolic tangent'],       label: 'tanh' },

    // ── Calculus ──
    { terms: ['limit', 'lim', '\\lim', '\\to', 'approaches'], label: 'limit' },
    { terms: ['sum', 'summation', '\\sum', '\\Sigma', 'sigma notation'], label: 'summation' },
    { terms: ['integral', 'integrate', 'integration', '\\int', '\\oint', 'antiderivative'], label: 'integral' },
    { terms: ['derivative', 'differentiation', 'differentiate', '\\frac{d}{dx}', '\\partial', 'partial derivative'], label: 'derivative' },
    { terms: ['gradient', '\\nabla', 'nabla', 'del operator'], label: 'gradient' },

    // ── Symbols ──
    { terms: ['infinity', '\\infty', 'inf'],                 label: 'infinity' },
    { terms: ['sqrt', '\\sqrt', 'square root'],              label: 'square root' },
    { terms: ['pi', '\\pi'],                                 label: 'pi' },
    { terms: ['theta', '\\theta'],                           label: 'theta' },
    { terms: ['alpha', '\\alpha'],                           label: 'alpha' },
    { terms: ['beta', '\\beta'],                             label: 'beta' },
    { terms: ['gamma', '\\gamma'],                           label: 'gamma' },
    { terms: ['lambda', '\\lambda'],                         label: 'lambda' },
    { terms: ['epsilon', '\\epsilon', '\\varepsilon'],       label: 'epsilon' },
    { terms: ['delta', '\\delta', '\\Delta'],                label: 'delta' },
    { terms: ['omega', '\\omega', '\\Omega'],                label: 'omega' },
    { terms: ['phi', '\\phi', '\\varphi'],                   label: 'phi' },
    { terms: ['sigma', '\\sigma', '\\Sigma'],                label: 'sigma' },

    // ── Operators/Relations ──
    { terms: ['>=', '\\geq', '\\ge', 'greater or equal', 'greater than or equal'], label: '>=' },
    { terms: ['<=', '\\leq', '\\le', 'less or equal', 'less than or equal'],       label: '<=' },
    { terms: ['!=', '\\neq', '\\ne', 'not equal'],           label: '!=' },
    { terms: ['approximately', '\\approx', 'approx'],        label: 'approx' },
    { terms: ['proportional', '\\propto', 'propto'],          label: 'proportional' },
    { terms: ['forall', '\\forall', 'for all'],              label: 'forall' },
    { terms: ['exists', '\\exists', 'there exists'],         label: 'exists' },
    { terms: ['in', '\\in', 'element of', 'belongs to'],     label: 'element of' },
    { terms: ['subset', '\\subset', '\\subseteq', 'contained in'], label: 'subset' },
    { terms: ['union', '\\cup', '\\bigcup'],                 label: 'union' },
    { terms: ['intersection', '\\cap', '\\bigcap'],          label: 'intersection' },

    // ── Linear Algebra ──
    { terms: ['matrix', 'matrices', '\\begin{pmatrix}', '\\begin{bmatrix}', 'determinant', '\\det'], label: 'matrix' },
    { terms: ['eigenvalue', 'eigenvalues', 'eigenvalue problem', 'characteristic value'], label: 'eigenvalue' },
    { terms: ['eigenvector', 'eigenvectors', 'characteristic vector'], label: 'eigenvector' },
    { terms: ['transpose', '\\top', '\\intercal', 'transposed'], label: 'transpose' },
    { terms: ['dot product', 'inner product', '\\cdot', '\\langle', 'scalar product'], label: 'dot product' },
    { terms: ['cross product', '\\times', 'vector product'], label: 'cross product' },

    // ── Number sets ──
    { terms: ['real numbers', '\\mathbb{R}', '\\R', 'reals'], label: 'reals' },
    { terms: ['integers', '\\mathbb{Z}', '\\Z'],              label: 'integers' },
    { terms: ['natural numbers', '\\mathbb{N}', '\\N', 'naturals'], label: 'naturals' },
    { terms: ['complex numbers', '\\mathbb{C}', '\\C'],       label: 'complex numbers' },
    { terms: ['rationals', '\\mathbb{Q}', '\\Q', 'rational numbers'], label: 'rationals' },

    // ── Common functions ──
    { terms: ['exp', '\\exp', 'exponential', 'e^x', 'e^{x}'], label: 'exponential' },
    { terms: ['factorial', 'n!', '\\factorial'],              label: 'factorial' },
    { terms: ['binomial', '\\binom', 'choose', 'combination', 'C(n,k)'], label: 'binomial' },
    { terms: ['floor', '\\lfloor', '\\rfloor', 'floor function'], label: 'floor' },
    { terms: ['ceiling', '\\lceil', '\\rceil', 'ceil', 'ceiling function'], label: 'ceiling' },
    { terms: ['absolute value', '|x|', '\\lvert', '\\rvert', 'abs', 'modulus'], label: 'absolute value' },
  ];

  /** Build a fast lookup: term (lower) → group index */
  const _equivIndex = {};
  MATH_EQUIVALENCES.forEach((group, i) => {
    group.terms.forEach(t => { _equivIndex[t.toLowerCase()] = i; });
  });

  /**
   * Given a query string, find equivalence-expanded terms.
   * Returns { expanded: string, additions: [{ original, synonyms }] }
   * The expanded string has additional OR-style synonyms appended.
   */
  function expandEquivalences(query) {
    if (!query) return { expanded: query, additions: [] };
    const lower = query.toLowerCase();
    const additions = [];
    const alreadySeen = new Set();

    // Check each equivalence group to see if any term appears in the query
    MATH_EQUIVALENCES.forEach((group, idx) => {
      for (const term of group.terms) {
        const tLower = term.toLowerCase();
        // Use word-boundary-like check for short terms
        const escaped = tLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = tLower.length <= 3
          ? new RegExp('(?:^|\\s|\\\\)' + escaped + '(?:$|\\s|[^a-zA-Z])', 'i')
          : new RegExp(escaped, 'i');

        if (re.test(lower) && !alreadySeen.has(idx)) {
          alreadySeen.add(idx);
          // Collect synonyms NOT already in the query
          const synonyms = group.terms.filter(t => {
            const syn = t.toLowerCase();
            return !lower.includes(syn) && !syn.startsWith('\\') && syn !== tLower;
          });
          if (synonyms.length > 0) {
            additions.push({ original: term, synonyms, label: group.label });
          }
          break; // Only match first hit per group
        }
      }
    });

    // Append text synonyms to query (for text-mode searching)
    let expanded = query;
    if (additions.length > 0) {
      const extraTerms = additions
        .flatMap(a => a.synonyms)
        .filter(s => s.length > 2)  // skip very short ones
        .slice(0, 5);               // limit additions
      if (extraTerms.length > 0) {
        expanded = query + ' ' + extraTerms.join(' ');
      }
    }

    return { expanded, additions };
  }

  /**
   * Get all synonyms for a specific term (for keyword enrichment).
   */
  function getSynonyms(term) {
    const idx = _equivIndex[term.toLowerCase()];
    if (idx === undefined) return [];
    return MATH_EQUIVALENCES[idx].terms.filter(t => t.toLowerCase() !== term.toLowerCase());
  }

  /* ════════════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════════════ */
  return {
    autocorrect,         // Full autocorrect: autocorrect(text, 'latex'|'text')
    correctWord,         // Single word:      correctWord('eiganvalue')
    correctLatex,        // LaTeX commands:   correctLatex('\\frca{a}{b}')
    correctQuery,        // Full query:       correctQuery('converganse of seires')
    createSuggestionBanner, // UI banner
    levenshtein,         // Distance:         levenshtein('cat', 'bat')
    findClosest,         // Fuzzy:            findClosest('eiganvalue', [...])
    expandEquivalences,  // Synonym expansion: expandEquivalences('log of x')
    getSynonyms,         // Get synonyms:     getSynonyms('log') → ['ln', '\ln', ...]
    TYPO_MAP,            // Direct access for debugging
    LATEX_TYPO_MAP,
    MATH_EQUIVALENCES,   // Equivalence groups
    MATH_VOCABULARY,
  };

})();
