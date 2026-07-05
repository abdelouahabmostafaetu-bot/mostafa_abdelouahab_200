'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Pencil, Search, Trash2 } from 'lucide-react';
import {
  EXAM_TYPE_LABELS,
  type DoctorateProblemSummary,
} from '@/types/doctorate-problem';

type Props = { mode: 'edit' | 'remove' };

export default function DoctorateAdminList({ mode }: Props) {
  const [problems, setProblems] = useState<DoctorateProblemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [search, setSearch] = useState('');
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const all: DoctorateProblemSummary[] = [];
        let page = 1;
        for (;;) {
          const res = await fetch(
            `/api/doctorate-problems?admin=1&limit=100&page=${page}`,
            { cache: 'no-store' },
          );
          const payload = (await res.json().catch(() => null)) as {
            success?: boolean;
            data?: DoctorateProblemSummary[];
            pagination?: { pages: number };
            error?: string;
          } | null;

          if (!res.ok || !payload?.success || !Array.isArray(payload.data)) {
            throw new Error(payload?.error ?? 'Failed to load problems.');
          }

          all.push(...payload.data);
          const pages = payload.pagination?.pages ?? 1;
          if (page >= pages || page >= 50) break;
          page += 1;
        }
        setProblems(all);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Unable to load problems.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter((p) =>
      `${p.title} ${p.specialty} ${p.university} ${p.year} ${p.tags.join(' ')}`
        .toLowerCase()
        .includes(q),
    );
  }, [problems, search]);

  const handleDelete = async (slug: string) => {
    setDeletingSlug(slug);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await fetch(`/api/doctorate-problems/${slug}`, {
        method: 'DELETE',
      });
      const payload = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to delete problem.');
      }

      setProblems((prev) => prev.filter((p) => p.slug !== slug));
      setStatusMsg('Problem deleted successfully.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to delete problem.',
      );
    } finally {
      setDeletingSlug(null);
      setConfirmSlug(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-[var(--color-text-secondary)]">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        Loading problems…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, year, specialty, tag…"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]"
        />
      </div>

      {errorMsg && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/15 px-4 py-2.5 text-sm text-red-300">
          {errorMsg}
        </p>
      )}
      {statusMsg && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/15 px-4 py-2.5 text-sm text-emerald-300">
          {statusMsg}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-tertiary)]">
          {problems.length === 0
            ? 'No problems yet. Add your first problem!'
            : 'No problems match your search.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li
              key={p.slug}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--color-text)]">
                  {p.title}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--color-text-tertiary)]">
                  <span>{p.year}</span>
                  <span>•</span>
                  <span>{EXAM_TYPE_LABELS[p.examType]}</span>
                  <span>•</span>
                  <span>{p.specialty}</span>
                  {p.published === false && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-px text-[10px] text-amber-300">
                      Draft
                    </span>
                  )}
                  {p.hasSolution && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                      <CheckCircle2 size={10} aria-hidden="true" /> Solution
                    </span>
                  )}
                </p>
              </div>

              {mode === 'edit' ? (
                <Link
                  href={`/admin/doctorate-exams/edit?slug=${encodeURIComponent(p.slug)}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <Pencil size={12} aria-hidden="true" />
                  Edit
                </Link>
              ) : confirmSlug === p.slug ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDelete(p.slug)}
                    disabled={deletingSlug === p.slug}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {deletingSlug === p.slug ? (
                      <Loader2
                        size={12}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 size={12} aria-hidden="true" />
                    )}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSlug(null)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmSlug(p.slug)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 size={12} aria-hidden="true" />
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
