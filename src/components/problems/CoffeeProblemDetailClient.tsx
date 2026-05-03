'use client';

import { useState } from 'react';

type HtmlSection = {
  title: string;
  html: string;
};

function HtmlBlock({ html }: { html: string }) {
  return (
    <div
      className="problem-content solution-content markdown-content prose-academic"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function CoffeeProblemDetailClient({
  hint1,
  hint2,
  solution,
}: {
  hint1?: HtmlSection | null;
  hint2?: HtmlSection | null;
  solution?: HtmlSection | null;
}) {
  const [openHint1, setOpenHint1] = useState(false);
  const [openHint2, setOpenHint2] = useState(false);
  const [openSolution, setOpenSolution] = useState(false);

  return (
    <div className="space-y-4">
      {hint1?.html ? (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <button
            type="button"
            onClick={() => setOpenHint1((value) => !value)}
            className="w-full text-left text-sm font-semibold text-[var(--color-accent)]"
          >
            {openHint1 ? 'Hide Hint 1' : 'Show Hint 1'}
          </button>
          {openHint1 ? (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <HtmlBlock html={hint1.html} />
            </div>
          ) : null}
        </section>
      ) : null}

      {hint2?.html ? (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <button
            type="button"
            onClick={() => setOpenHint2((value) => !value)}
            className="w-full text-left text-sm font-semibold text-[var(--color-accent)]"
          >
            {openHint2 ? 'Hide Hint 2' : 'Show Hint 2'}
          </button>
          {openHint2 ? (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <HtmlBlock html={hint2.html} />
            </div>
          ) : null}
        </section>
      ) : null}

      {solution?.html ? (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <button
            type="button"
            onClick={() => setOpenSolution((value) => !value)}
            className="w-full text-left text-sm font-semibold text-[var(--color-accent)]"
          >
            {openSolution ? 'Hide Solution' : 'Show Solution'}
          </button>
          {openSolution ? (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <HtmlBlock html={solution.html} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
