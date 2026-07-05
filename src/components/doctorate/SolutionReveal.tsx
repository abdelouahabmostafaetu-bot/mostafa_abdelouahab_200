'use client';

import { useState } from 'react';
import { ChevronDown, Eye, EyeOff, Lightbulb } from 'lucide-react';

/**
 * SolutionReveal — hides the solution behind a toggle so readers can
 * attempt the problem first. The solution content itself is rendered on
 * the server (KaTeX included) and passed in as children.
 */
export default function SolutionReveal({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-12 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--color-hover)]"
      >
        <span className="inline-flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Lightbulb
              size={15}
              className="text-emerald-400"
              aria-hidden="true"
            />
          </span>
          <span>
            <span className="block text-sm font-semibold text-[var(--color-text)]">
              Solution
            </span>
            <span className="block text-[11px] text-[var(--color-text-tertiary)]">
              {open
                ? 'Full worked solution shown below'
                : 'Try the problem yourself first, then reveal the solution'}
            </span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
          {open ? (
            <>
              <EyeOff size={13} aria-hidden="true" /> Hide
            </>
          ) : (
            <>
              <Eye size={13} aria-hidden="true" /> Show
            </>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] px-5 py-6">
          <div className="notes-reading">{children}</div>
        </div>
      )}
    </section>
  );
}
