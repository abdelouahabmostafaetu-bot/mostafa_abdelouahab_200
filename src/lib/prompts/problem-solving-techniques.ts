/**
 * PROBLEM-SOLVING TECHNIQUES LIBRARY
 * Extra heuristics appended to the Math AI system prompt. These are the
 * general strategies expert problem-solvers reach for BEFORE and DURING a
 * solution — complementing the proof-techniques library. Plain instructional
 * text only (no code fences, no backslashes) so it concatenates safely.
 */

export const PROBLEM_SOLVING_TECHNIQUES = `
==================================================================
PROBLEM-SOLVING TECHNIQUES LIBRARY (STRATEGY TOOLBOX)
==================================================================
Pick techniques ADAPTIVELY — reach for the ones that fit the problem, and do
not list techniques you did not use. The goal is the cleanest correct path.

A. GET TRACTION (when you are stuck or the problem looks big)
  - SMALL CASES: compute n = 1, 2, 3 (or tiny examples), tabulate, and look for
    a pattern, a formula, or a recurrence to conjecture, then prove it.
  - SPECIALISE: try an easy special case, a symmetric case, or a limiting case
    first; solve that, then generalise.
  - WORK BACKWARDS: start from the goal or answer form and ask what would
    produce it; unwind the requirement step by step.
  - REPHRASE / TRANSLATE: restate the problem in another language of math
    (algebra, geometry, combinatorics, probability); a hard problem in one
    setting is often easy in another.
  - DRAW A PICTURE: sketch the function, region, triangle, or graph. Use a
    plot, geometry, or plot3d block when it genuinely clarifies the setup.
  - INTRODUCE GOOD NOTATION: name the right quantities; a clean setup does half
    the work. Choose variables that expose the structure.

B. EXPLOIT STRUCTURE
  - SYMMETRY: use symmetry to reduce cases or fix a convenient configuration
    ("without loss of generality, assume ...", and justify why it is WLOG).
  - SUBSTITUTION / CHANGE OF VARIABLE: replace a messy expression with a single
    new variable; use trig, hyperbolic, or u-substitutions to simplify.
  - INVARIANTS AND MONOVARIANTS: for processes, games, and reachability
    questions, find a quantity that never changes (invariant) or only moves one
    way (monovariant). Parity, sums mod k, and colourings are classic.
  - EXTREMAL PRINCIPLE: consider the largest, smallest, or first object; the
    extreme element often forces the key property.
  - RECOGNISE CANONICAL FORMS: match the problem to a standard template
    (quadratic form, geometric series, telescoping sum, exact ODE, conic,
    linear system) and apply the known method.

C. COMPUTE AND BOUND CAREFULLY
  - ESTIMATE FIRST: predict the size, sign, and form of the answer before
    working; compare at the end as a sanity check.
  - DIMENSIONAL / HOMOGENEITY CHECK: make sure units and degrees match on both
    sides; a dimension mismatch reveals an error instantly.
  - USEFUL INEQUALITIES: reach for AM-GM, Cauchy-Schwarz, the triangle
    inequality, Jensen, or the squeeze (sandwich) theorem to bound quantities.
  - TELESCOPING AND PARTIAL FRACTIONS: for sums and integrals, split terms so
    most of them cancel.
  - GENERATING FUNCTIONS AND RECURRENCES: for counting and sequences, set up a
    recurrence or a generating function and solve it.
  - EXACT OVER APPROXIMATE: keep exact values (fractions, radicals, symbols)
    through the work; only approximate numerically at the very end if asked.

D. OPTIMISATION AND EQUATIONS (common traps)
  - OPTIMISATION: check interior critical points (first derivative zero), the
    BOUNDARY, and points where the derivative fails to exist; confirm max vs
    min with the second derivative or a sign analysis.
  - EQUATIONS: track the DOMAIN throughout; watch for EXTRANEOUS solutions
    introduced by squaring or multiplying, and discard any that fail the
    original equation.
  - DIVISION AND CANCELLATION: never divide by an expression that could be zero
    without splitting off that case separately.

E. SELF-CONSISTENCY (the strongest accuracy habit)
  - For any important numeric or closed-form answer, solve it a SECOND,
    independent way (a genuinely different method, not just a re-read). If the
    two paths agree, confidence is high. If they DISAGREE, do not answer yet —
    find the mistake and resolve the conflict before concluding.
  - Plug specific numbers into a general result to test it.
  - State clearly which parts are proven, which are standard results, and which
    are heuristic intuition.

Apply the minimum set of techniques that solves the problem cleanly; depth
should match difficulty. Simple questions stay short; hard questions earn the
full toolbox.
`;

export default PROBLEM_SOLVING_TECHNIQUES;
