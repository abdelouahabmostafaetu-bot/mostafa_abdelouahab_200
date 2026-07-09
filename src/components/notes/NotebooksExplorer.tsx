'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, FileText, Plus, Settings } from 'lucide-react';
import Reveal from '@/components/visual/Reveal';
import MathMotif from '@/components/visual/MathMotif';
import GenerativeCover from '@/components/visual/GenerativeCover';

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
  const subject = normalizeSubject(notebook.subject);
  const spineColor = notebook.color || 'var(--accent)';

  return (
    <Link
      href={`/notes/notebook/${notebook.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] transition duration-200 ease-out hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--shadow-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transform-none motion-reduce:transition-none"
    >
      {/* Generative cover thumbnail (deterministic; graceful, always renders) */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <GenerativeCover
          seed={notebook.slug || notebook.id}
          label={subject}
          color={spineColor}
          className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: spineColor }}
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[var(--tracking-wide)] text-[var(--text-subtle)]">
          {subject}
        </p>

        <h2 className="mt-3 font-serif text-xl leading-snug text-[var(--text)] transition-colors duration-150 group-hover:text-[var(--accent)]">
          {notebook.title}
        </h2>

        {notebook.description && (
          <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-[var(--text-muted)]">
            {notebook.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-subtle)]">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {notebook.pageCount} page{notebook.pageCount !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
            Read
            <ArrowUpRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" />
          </span>
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
    return notebooks.filter((nb) => normalizeSubject(nb.subject) === subject);
  }, [notebooks, subject]);

  const hasFilters = subject !== 'all';

  const clearFilters = () => {
    setSubject('all');
  };

  const chipClass = (active: boolean) =>
    `inline-flex min-h-[36px] items-center rounded-[var(--radius-full)] border px-3.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none ${
      active
        ? 'border-[var(--accent)] bg-[var(--accent)] font-semibold text-[var(--bg)]'
        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
    }`;

  return (
    <div className="mx-auto max-w-wide px-4 py-10 sm:px-6 md:py-14">
      {/* ===== Header ===== */}
      <header className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
        <div className="absolute inset-0 bg-hero-mesh" aria-hidden="true" />
        <MathMotif
          name="torus"
          opacity={0.1}
          className="absolute -right-2 top-1/2 hidden h-[130%] -translate-y-1/2 sm:block"
        />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Research Journal</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-[var(--text)] sm:text-5xl">
              My Notebooks
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              Theories, theorems, definitions, and observations from ongoing
              research in mathematics.
            </p>
          </div>

          {isAdmin && (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/notes/admin/create"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--bg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New notebook
              </Link>
              <Link
                href="/notes/admin"
                aria-label="Manage notebooks"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
              >
                <Settings className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ===== Subject filter ===== */}
      {notebooks.length > 0 && subjects.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubject('all')}
            className={chipClass(subject === 'all')}
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
              className={chipClass(subject === name)}
            >
              {name} ({count})
            </button>
          ))}
        </div>
      )}

      {/* ===== Grid ===== */}
      {notebooks.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-full)] bg-[var(--surface)] text-[var(--text-subtle)]">
            <FileText className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            No notebooks published yet.
          </p>
          {isAdmin && (
            <Link
              href="/notes/admin/create"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--bg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create first notebook
            </Link>
          )}
        </div>
      ) : visibleNotebooks.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-full)] bg-[var(--surface)] text-[var(--text-subtle)]">
            <FileText className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            No notebooks match this subject.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleNotebooks.map((nb, i) => (
            <Reveal key={nb.id} className="h-full" delay={(i % 3) * 70}>
              <NotebookCard notebook={nb} />
            </Reveal>
          ))}

          {isAdmin && !hasFilters && (
            <Link
              href="/notes/admin/create"
              className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-5 text-sm font-medium text-[var(--text-subtle)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
            >
              <Plus className="h-6 w-6" aria-hidden="true" />
              New Notebook
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
