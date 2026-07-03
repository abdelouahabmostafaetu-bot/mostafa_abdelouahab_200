'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, FileText, Plus, Search, X } from 'lucide-react';
import SiteIcon from '@/components/ui/SiteIcon';

export type NotebookSummary = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  description: string;
  color: string;
  pageCount: number;
};

function normalizeSubject(subject: string | undefined | null): string {
  const trimmed = (subject ?? '').trim();
  return trimmed || 'General';
}

function NotebookCard({ notebook }: { notebook: NotebookSummary }) {
  const accent = notebook.color || 'var(--color-accent)';
  const accentStyle = { backgroundColor: accent };

  return (
    <Link
      href={`/notes/notebook/${notebook.slug}`}
      className="group relative flex overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-accent)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.4)]"
    >
      {/* Notebook spine */}
      <span
        className="w-1.5 shrink-0 opacity-80 transition-opacity duration-200 group-hover:opacity-100"
        style={accentStyle}
        aria-hidden="true"
      />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={accentStyle}
            aria-hidden="true"
          />
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            {normalizeSubject(notebook.subject)}
          </p>
        </div>

        <h2 className="mt-3 font-serif text-lg leading-snug text-[var(--color-text)] text-balance transition-colors duration-200 group-hover:text-[var(--color-accent-light)]">
          {notebook.title}
        </h2>

        {notebook.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {notebook.description}
          </p>
        )}

        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3.5 text-xs text-[var(--color-text-tertiary)]">
            <span className="inline-flex items-center gap-1.5">
              <FileText size={12} aria-hidden="true" />
              {notebook.pageCount} page{notebook.pageCount !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-accent)]">
              Read
              <ArrowUpRight size={12} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function NotebooksExplorer({
  notebooks,
  isAdmin,
}: {
  notebooks: NotebookSummary[];
  isAdmin: boolean;
}) {
  const [subject, setSubject] = useState('all');

  const subjects = useMemo(() => {
    const subjectCounts = new Map<string, number>();
    for (const nb of notebooks) {
      const key = normalizeSubject(nb.subject);
      subjectCounts.set(key, (subjectCounts.get(key) ?? 0) + 1);
    }
    return Array.from(subjectCounts.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [notebooks]);

  const visibleNotebooks = useMemo(() => {
    if (subject === 'all') return notebooks;
    return notebooks.filter(
      (nb) => normalizeSubject(nb.subject) === subject,
    );
  }, [notebooks, subject]);

  const hasFilters = subject !== 'all';

  const clearFilters = () => {
    setSubject('all');
  };

  return (
    <main className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        {/* Header */}
        <header className="mb-8 border-b border-[var(--color-border)] pb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Research Journal
              </p>
              <h1 className="font-serif text-3xl text-[var(--color-text)] md:text-4xl text-balance">
                My Notebooks
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Theories, theorems, definitions, and observations from ongoing
                research in mathematics.
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <Link
                  href="/notes/admin/create"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-[var(--color-bg)] transition-opacity hover:opacity-90"
                >
                  <Plus size={14} aria-hidden="true" />
                  New notebook
                </Link>
                <Link
                  href="/notes/admin"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <SiteIcon name="settings" alt="" className="h-3.5 w-3.5" />
                  Manage
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Subject filter */}
        {notebooks.length > 0 && subjects.length > 1 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubject('all')}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                subject === 'all'
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] font-semibold text-[var(--color-bg)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
              }`}
            >
              All ({notebooks.length})
            </button>
            {subjects.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() =>
                  setSubject((prev) => (prev === name ? 'all' : name))
                }
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  subject === name
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] font-semibold text-[var(--color-bg)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
                }`}
              >
                {name} ({count})
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {notebooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-16 text-center">
            <SiteIcon
              name="notebook"
              alt=""
              className="mx-auto mb-3 h-8 w-8 opacity-40"
            />
            <p className="text-sm text-[var(--color-text-secondary)]">
              No notebooks published yet.
            </p>
            {isAdmin && (
              <Link
                href="/notes/admin/create"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <Plus size={14} aria-hidden="true" />
                Create first notebook
              </Link>
            )}
          </div>
        ) : visibleNotebooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-16 text-center">
            <Search
              size={26}
              aria-hidden="true"
              className="mx-auto mb-3 text-[var(--color-text-tertiary)] opacity-60"
            />
            <p className="text-sm text-[var(--color-text-secondary)]">
              No notebooks match this subject.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <X size={14} aria-hidden="true" />
              Clear filter
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleNotebooks.map((nb) => (
              <NotebookCard key={nb.id} notebook={nb} />
            ))}

            {isAdmin && !hasFilters && (
              <Link
                href="/notes/admin/create"
                className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-8 text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <Plus size={20} aria-hidden="true" />
                <span className="text-xs font-medium">New Notebook</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
