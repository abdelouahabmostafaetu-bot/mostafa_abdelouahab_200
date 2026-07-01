'use client';

import { useState } from 'react';
import { Sigma, Lightbulb, X } from 'lucide-react';

export type QuickMode = { id: string; label: string; directive: string };

// Task presets. Selecting one appends a short instruction to the message that
// is sent to the model (the user's typed text stays clean on screen).
export const QUICK_MODES: QuickMode[] = [
  {
    id: 'steps',
    label: 'Step-by-step',
    directive:
      'Solve this with clearly numbered steps and explain the reasoning behind each step.',
  },
  {
    id: 'hint',
    label: 'Hint only',
    directive:
      'Do NOT give the full solution. Give only one short hint that nudges me toward solving it myself.',
  },
  {
    id: 'proof',
    label: 'Prove it',
    directive:
      'Give a rigorous, formal proof. State your assumptions clearly and justify every step.',
  },
  {
    id: 'graph',
    label: 'Graph it',
    directive:
      'Include a plottable function and describe its key features (intercepts, asymptotes, extrema, and overall behavior).',
  },
  {
    id: 'check',
    label: 'Check my work',
    directive:
      'Carefully check the work I provide for mistakes, explain any errors you find, and give the corrected result.',
  },
  {
    id: 'simple',
    label: 'Explain simply',
    directive:
      'First explain the idea in simple, intuitive terms for a beginner, then give the precise, formal version.',
  },
  {
    id: 'practice',
    label: 'Practice set',
    directive:
      'Generate 5 practice problems on this topic ordered from easy to hard, then provide full worked solutions.',
  },
];

type MathSymbol = { label: string; insert: string; title: string };
type SymbolGroup = { id: string; label: string; symbols: MathSymbol[] };

// A single backslash, built at runtime so this source file stays free of
// escape sequences (keeps the LaTeX inserts unambiguous).
const BS = String.fromCharCode(92);

const SYMBOL_GROUPS: SymbolGroup[] = [
  {
    id: 'basic',
    label: 'Basic',
    symbols: [
      { label: 'x²', insert: '^2', title: 'Square' },
      { label: 'xⁿ', insert: '^{ }', title: 'Power' },
      { label: 'xₙ', insert: '_{ }', title: 'Subscript' },
      { label: '√', insert: BS + 'sqrt{ }', title: 'Square root' },
      { label: 'ⁿ√', insert: BS + 'sqrt[n]{ }', title: 'nth root' },
      { label: 'a⁄b', insert: BS + 'frac{ }{ }', title: 'Fraction' },
      { label: '( )', insert: BS + 'left( ' + BS + 'right)', title: 'Auto-sized parentheses' },
      { label: '|x|', insert: BS + 'left| ' + BS + 'right|', title: 'Absolute value' },
      { label: '±', insert: BS + 'pm ', title: 'Plus or minus' },
      { label: '×', insert: BS + 'times ', title: 'Times' },
      { label: '·', insert: BS + 'cdot ', title: 'Dot product' },
      { label: '÷', insert: BS + 'div ', title: 'Divide' },
    ],
  },
  {
    id: 'calculus',
    label: 'Calculus',
    symbols: [
      { label: '∫', insert: BS + 'int_{ }^{ } ', title: 'Integral' },
      { label: '∮', insert: BS + 'oint ', title: 'Contour integral' },
      { label: '∑', insert: BS + 'sum_{ }^{ } ', title: 'Summation' },
      { label: '∏', insert: BS + 'prod_{ }^{ } ', title: 'Product' },
      { label: 'lim', insert: BS + 'lim_{x ' + BS + 'to } ', title: 'Limit' },
      { label: 'd/dx', insert: BS + 'frac{d}{dx} ', title: 'Derivative' },
      { label: '∂', insert: BS + 'partial ', title: 'Partial derivative' },
      { label: '∇', insert: BS + 'nabla ', title: 'Gradient / nabla' },
      { label: '∞', insert: BS + 'infty ', title: 'Infinity' },
      { label: '→', insert: BS + 'to ', title: 'Approaches' },
    ],
  },
  {
    id: 'greek',
    label: 'Greek',
    symbols: [
      { label: 'π', insert: BS + 'pi ', title: 'Pi' },
      { label: 'θ', insert: BS + 'theta ', title: 'Theta' },
      { label: 'α', insert: BS + 'alpha ', title: 'Alpha' },
      { label: 'β', insert: BS + 'beta ', title: 'Beta' },
      { label: 'γ', insert: BS + 'gamma ', title: 'Gamma' },
      { label: 'λ', insert: BS + 'lambda ', title: 'Lambda' },
      { label: 'μ', insert: BS + 'mu ', title: 'Mu' },
      { label: 'σ', insert: BS + 'sigma ', title: 'Sigma (lower)' },
      { label: 'φ', insert: BS + 'phi ', title: 'Phi' },
      { label: 'ω', insert: BS + 'omega ', title: 'Omega (lower)' },
      { label: 'Δ', insert: BS + 'Delta ', title: 'Delta' },
      { label: 'Σ', insert: BS + 'Sigma ', title: 'Sigma (upper)' },
      { label: 'Ω', insert: BS + 'Omega ', title: 'Omega (upper)' },
    ],
  },
  {
    id: 'relations',
    label: 'Relations',
    symbols: [
      { label: '≤', insert: BS + 'le ', title: 'Less than or equal' },
      { label: '≥', insert: BS + 'ge ', title: 'Greater than or equal' },
      { label: '≠', insert: BS + 'ne ', title: 'Not equal' },
      { label: '≈', insert: BS + 'approx ', title: 'Approximately equal' },
      { label: '≡', insert: BS + 'equiv ', title: 'Equivalent / congruent' },
      { label: '∝', insert: BS + 'propto ', title: 'Proportional to' },
      { label: '⇒', insert: BS + 'Rightarrow ', title: 'Implies' },
      { label: '⇔', insert: BS + 'Leftrightarrow ', title: 'If and only if' },
      { label: '∴', insert: BS + 'therefore ', title: 'Therefore' },
      { label: '∵', insert: BS + 'because ', title: 'Because' },
    ],
  },
  {
    id: 'logic',
    label: 'Sets & Logic',
    symbols: [
      { label: '∈', insert: BS + 'in ', title: 'Element of' },
      { label: '∉', insert: BS + 'notin ', title: 'Not an element of' },
      { label: '⊂', insert: BS + 'subset ', title: 'Subset' },
      { label: '⊆', insert: BS + 'subseteq ', title: 'Subset or equal' },
      { label: '∪', insert: BS + 'cup ', title: 'Union' },
      { label: '∩', insert: BS + 'cap ', title: 'Intersection' },
      { label: '∅', insert: BS + 'emptyset ', title: 'Empty set' },
      { label: '∀', insert: BS + 'forall ', title: 'For all' },
      { label: '∃', insert: BS + 'exists ', title: 'There exists' },
      { label: 'ℝ', insert: BS + 'mathbb{R} ', title: 'Real numbers' },
      { label: 'ℤ', insert: BS + 'mathbb{Z} ', title: 'Integers' },
      { label: 'ℕ', insert: BS + 'mathbb{N} ', title: 'Natural numbers' },
      { label: 'ℚ', insert: BS + 'mathbb{Q} ', title: 'Rational numbers' },
    ],
  },
  {
    id: 'structures',
    label: 'Structures',
    symbols: [
      { label: '[matrix]', insert: BS + 'begin{bmatrix}  ' + BS + 'end{bmatrix} ', title: 'Bracket matrix' },
      { label: '(matrix)', insert: BS + 'begin{pmatrix}  ' + BS + 'end{pmatrix} ', title: 'Parenthesis matrix' },
      { label: 'cases', insert: BS + 'begin{cases}  ' + BS + 'end{cases} ', title: 'Piecewise / system' },
      { label: 'vec', insert: BS + 'vec{ } ', title: 'Vector arrow' },
      { label: 'hat', insert: BS + 'hat{ } ', title: 'Hat / unit vector' },
      { label: 'bar', insert: BS + 'overline{ } ', title: 'Overline / conjugate' },
      { label: 'C(n,k)', insert: BS + 'binom{n}{k} ', title: 'Binomial coefficient' },
      { label: 'ẋ', insert: BS + 'dot{ } ', title: 'Dot (time derivative)' },
    ],
  },
];

type Props = {
  activeMode: string | null;
  onSelectMode: (id: string | null) => void;
  onInsertSymbol: (snippet: string) => void;
  disabled?: boolean;
};

export default function MathInputTools({
  activeMode,
  onSelectMode,
  onInsertSymbol,
  disabled,
}: Props) {
  const [showSymbols, setShowSymbols] = useState(false);
  const [group, setGroup] = useState(SYMBOL_GROUPS[0].id);

  const activeGroup = SYMBOL_GROUPS.find((g) => g.id === group) || SYMBOL_GROUPS[0];

  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowSymbols((v) => !v)}
          title="Insert a math symbol"
          aria-label="Toggle math symbol keyboard"
          aria-pressed={showSymbols}
          className={
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ' +
            (showSymbols
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-bg-muted)]'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]')
          }
        >
          <Sigma className="h-3.5 w-3.5" aria-hidden="true" /> Symbols
        </button>

        <span className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />

        <Lightbulb className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" aria-hidden="true" />
        {QUICK_MODES.map((m) => {
          const on = activeMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMode(on ? null : m.id)}
              title={m.directive}
              aria-label={m.label + ' mode'}
              aria-pressed={on}
              className={
                'rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-40 ' +
                (on
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-bg-muted)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]')
              }
            >
              {m.label}
            </button>
          );
        })}
        {activeMode && (
          <button
            type="button"
            onClick={() => onSelectMode(null)}
            title="Clear mode"
            aria-label="Clear selected mode"
            className="inline-flex items-center rounded-full p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {showSymbols && (
        <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2">
          <div className="mb-2 flex flex-wrap gap-1 border-b border-[var(--color-border)] pb-2">
            {SYMBOL_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroup(g.id)}
                aria-label={g.label + ' symbols'}
                aria-pressed={g.id === group}
                className={
                  'rounded-md px-2 py-1 text-[11px] font-medium transition-colors ' +
                  (g.id === group
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]')
                }
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {activeGroup.symbols.map((s) => (
              <button
                key={s.label + s.insert}
                type="button"
                onClick={() => onInsertSymbol(s.insert)}
                title={s.title}
                aria-label={'Insert ' + s.title}
                className="min-w-[2.25rem] rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
