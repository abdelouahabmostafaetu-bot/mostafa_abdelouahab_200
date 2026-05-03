'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ProblemSummary, ProblemsResponse } from '@/types/problem';

function formatDate(value: string) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getPayloadError(payload: ProblemsResponse | { error?: string } | null) {
  return payload && 'error' in payload ? payload.error : undefined;
}

export default function ProblemsAdminClient() {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const loadProblems = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const allProblems: ProblemSummary[] = [];
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage && page <= 100) {
        const response = await fetch(`/api/problems?admin=1&page=${page}&limit=50`, {
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as
          | ProblemsResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(getPayloadError(payload) ?? 'Failed to load problems.');
        }

        const data = payload as ProblemsResponse;
        allProblems.push(...(Array.isArray(data.problems) ? data.problems : []));
        hasNextPage = Boolean(data.pagination?.hasNextPage);
        page += 1;
      }

      setProblems(allProblems);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load problems.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProblems();
  }, []);

  const deleteProblem = async (problem: ProblemSummary) => {
    const confirmed = window.confirm(`Delete "${problem.title}"?`);
    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const problemId = problem.id || problem.slug;
      const response = await fetch(`/api/problems/${problemId}`, {
        method: 'DELETE',
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

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
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-[var(--color-border)] pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                Manage Problems
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Add, edit, publish, and remove Problems with Coffee entries.
              </p>
              <Link
                href="/problems-with-coffee"
                className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
              >
                Back to Problems with Coffee
              </Link>
            </div>
            <Link
              href="/admin/problems/new"
              className="inline-flex items-center justify-center rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#0f0e0d] hover:opacity-90"
            >
              Add New Problem
            </Link>
          </div>
        </header>

        {isLoading ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Loading problems...</p>
        ) : problems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-12 text-center text-sm text-[var(--color-text-secondary)]">
            No problems yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="hidden grid-cols-[1fr_130px_130px_160px] gap-3 border-b border-[var(--color-border)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] md:grid">
              <span>Title</span>
              <span>Difficulty</span>
              <span>Time</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {problems.map((problem) => (
                <article
                  key={problem.id || problem.slug}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_130px_130px_160px] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold">{problem.title}</h2>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                          problem.isPublished
                            ? 'border-emerald-500/30 text-emerald-300'
                            : 'border-amber-500/30 text-amber-300'
                        }`}
                      >
                        {problem.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-[var(--color-text-tertiary)]">
                      {problem.slug} · Created {formatDate(problem.createdAt)}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                    {problem.difficulty}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {problem.estimatedTime}
                  </p>
                  <div className="flex gap-2 md:justify-end">
                    <Link
                      href={`/admin/problems/edit/${problem.id || problem.slug}`}
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
                </article>
              ))}
            </div>
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
