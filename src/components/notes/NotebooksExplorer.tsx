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

type SortKey = 'newest' | 'title' | 'pages';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [subject, setSubject] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');

  const totalPages = useMemo(
    () => notebooks.reduce((sum, nb) => sum + nb.pageCount, 0),
    [notebooks],
  );

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
    const term = searchTerm.trim().toLowerCase();

    const filtered = notebooks.filter((nb) => {
      if (subject !== 'all' && normalizeSubject(nb.subject) !== subject) {
        return false;
      }
      if (!term) return true;
      const haystack =
        `${nb.title} ${nb.subject ?? ''} ${nb.description ?? ''}`.toLowerCase();
      return haystack.includes(term);
    });

    if (sortKey === 'title') {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortKey === 'pages') {
      return [...filtered].sort((a, b) => b.pageCount - a.pageCount);
    }
    return filtered; // 'newest' — server already sorts by createdAt desc
  }, [notebooks, searchTerm, subject, sortKey]);

  const hasFilters = searchTerm.trim() !== '' || subject !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
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

          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
              <SiteIcon name="notebook" alt="" className="h-3.5 w-3.5" />
              <strong className="font-semibold text-[var(--color-text)]">
                {notebooks.length}
              </strong>
              notebook{notebooks.length !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
              <FileText size={13} aria-hidden="true" />
              <strong className="font-semibold text-[var(--color-text)]">
                {totalPages}
              </strong>
              page{totalPages !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
              <SiteIcon name="book" alt="" className="h-3.5 w-3.5" />
              <strong className="font-semibold text-[var(--color-text)]">
                {subjects.length}
              </strong>
              subject{subjects.length !== 1 ? 's' : ''}
            </span>
          </div>
        </header>

        {/* Explore toolbar */}
        {notebooks.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search notebooks by title, subject, or topic…"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-9 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                  aria-label="Search notebooks"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)]"
                    aria-label="Clear search"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <label className="inline-flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                Sort
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]"
                >
                  <option value="newest">Newest first</option>
                  <option value="title">Title A–Z</option>
                  <option value="pages">Most pages</option>
                </select>
              </label>
            </div>

            {/* Subject chips */}
            {subjects.length > 1 && (
              <div className="flex flex-wrap gap-2">
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

            {/* Result count when filtering */}
            {hasFilters && (
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Found {visibleNotebooks.length} of {notebooks.length} notebook
                {notebooks.length !== 1 ? 's' : ''}
              </p>
            )}
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
              No notebooks match your search.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <X size={14} aria-hidden="true" />
              Clear filters
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
