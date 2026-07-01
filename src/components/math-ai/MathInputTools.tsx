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

// A single backslash, built at runtime so this source file stays free of
// escape sequences (keeps the LaTeX inserts unambiguous).
const BS = String.fromCharCode(92);

const MATH_SYMBOLS: MathSymbol[] = [
  { label: 'x²', insert: '^2', title: 'Square' },
  { label: 'xⁿ', insert: '^{ }', title: 'Power' },
  { label: '√', insert: BS + 'sqrt{ }', title: 'Square root' },
  { label: 'ⁿ√', insert: BS + 'sqrt[n]{ }', title: 'nth root' },
  { label: 'a⁄b', insert: BS + 'frac{ }{ }', title: 'Fraction' },
  { label: '∫', insert: BS + 'int_{ }^{ } ', title: 'Integral' },
  { label: '∑', insert: BS + 'sum_{ }^{ } ', title: 'Summation' },
  { label: '∏', insert: BS + 'prod_{ }^{ } ', title: 'Product' },
  { label: 'lim', insert: BS + 'lim_{x ' + BS + 'to } ', title: 'Limit' },
  { label: 'd/dx', insert: BS + 'frac{d}{dx} ', title: 'Derivative' },
  { label: '∂', insert: BS + 'partial ', title: 'Partial derivative' },
  { label: 'π', insert: BS + 'pi ', title: 'Pi' },
  { label: 'θ', insert: BS + 'theta ', title: 'Theta' },
  { label: 'α', insert: BS + 'alpha ', title: 'Alpha' },
  { label: 'β', insert: BS + 'beta ', title: 'Beta' },
  { label: 'Δ', insert: BS + 'Delta ', title: 'Delta' },
  { label: '∞', insert: BS + 'infty ', title: 'Infinity' },
  { label: '≤', insert: BS + 'le ', title: 'Less than or equal' },
  { label: '≥', insert: BS + 'ge ', title: 'Greater than or equal' },
  { label: '≠', insert: BS + 'ne ', title: 'Not equal' },
  { label: '±', insert: BS + 'pm ', title: 'Plus or minus' },
  { label: '×', insert: BS + 'times ', title: 'Times' },
  { label: '·', insert: BS + 'cdot ', title: 'Multiply (dot)' },
  { label: '→', insert: BS + 'to ', title: 'Approaches' },
  { label: '∈', insert: BS + 'in ', title: 'Element of' },
  { label: '∀', insert: BS + 'forall ', title: 'For all' },
  { label: '∃', insert: BS + 'exists ', title: 'There exists' },
  { label: '( )', insert: BS + 'left( ' + BS + 'right)', title: 'Auto-sized parentheses' },
  { label: '[matrix]', insert: BS + 'begin{bmatrix}  ' + BS + 'end{bmatrix} ', title: 'Matrix' },
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

  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowSymbols((v) => !v)}
          title="Insert a math symbol"
          className={
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ' +
            (showSymbols
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-bg-muted)]'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]')
          }
        >
          <Sigma className="h-3.5 w-3.5" /> Symbols
        </button>

        <span className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />

        <Lightbulb className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        {QUICK_MODES.map((m) => {
          const on = activeMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMode(on ? null : m.id)}
              title={m.directive}
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
            className="inline-flex items-center rounded-full p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showSymbols && (
        <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2">
          {MATH_SYMBOLS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onInsertSymbol(s.insert)}
              title={s.title}
              className="min-w-[2rem] rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
