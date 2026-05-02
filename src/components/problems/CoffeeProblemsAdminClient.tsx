'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CoffeeProblemSummary } from '@/types/coffee-problem';

type ProblemsPayload = {
  problems?: CoffeeProblemSummary[];
};

function formatDate(value: string) {
  if (!value) return 'Unknown date';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function CoffeeProblemsAdminClient() {
  const [problems, setProblems] = useState<CoffeeProblemSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const loadProblems = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({
        admin: '1',
        limit: '50',
      });
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/problems-with-coffee?${params.toString()}`, {
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as ProblemsPayload | null;

      if (!response.ok) {
        throw new Error('Failed to load problems.');
      }

      setProblems(Array.isArray(payload?.problems) ? payload.problems : []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load problems.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteProblem = async (problem: CoffeeProblemSummary) => {
    const confirmed = window.confirm(`Delete "${problem.title}"?`);
    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await fetch(`/api/problems-with-coffee/${problem.slug}`, {
        method: 'DELETE',
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete problem.');
      }

      setStatusMessage(`Deleted: ${problem.title}`);
      await loadProblems();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete problem.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                Problems with Coffee
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Manage published problems and drafts.
              </p>
              <Link
                href="/problems-with-coffee"
                className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
              >
                View public page
              </Link>
            </div>
            <Link
              href="/admin/problems-with-coffee/add"
              className="inline-flex items-center justify-center rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#0f0e0d] hover:opacity-90"
            >
              Add New Problem
            </Link>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search problems"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="button"
            onClick={() => void loadProblems()}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-bg-muted)]"
          >
            Search
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Loading problems...</p>
        ) : problems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
            No problems found.
          </div>
        ) : (
          <div className="space-y-3">
            {problems.map((problem) => (
              <article
                key={problem.slug}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold">{problem.title}</h2>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                          problem.published
                            ? 'border-emerald-500/30 text-emerald-300'
                            : 'border-amber-500/30 text-amber-300'
                        }`}
                      >
                        {problem.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-[var(--color-text-tertiary)]">
                      {problem.slug}
                    </p>
                    <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                      Created {formatDate(problem.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/problems-with-coffee/edit/${problem.slug}`}
                      className="rounded-md border border-blue-500/30 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-500/10"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => void deleteProblem(problem)}
                      disabled={isDeleting}
                      className="rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {statusMessage ? (
          <div className="mt-6 border-l-4 border-emerald-500/60 px-4 py-3 text-sm text-emerald-300">
            {statusMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-6 border-l-4 border-red-500/60 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
