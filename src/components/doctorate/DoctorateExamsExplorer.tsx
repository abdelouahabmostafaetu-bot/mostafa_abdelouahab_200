'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Download,
  GraduationCap,
  Search,
  Settings2,
} from 'lucide-react';
import {
  DIFFICULTY_LABELS,
  EXAM_TYPE_LABELS,
  type DoctorateExamType,
  type DoctorateProblemSummary,
} from '@/types/doctorate-problem';

type Props = {
  problems: DoctorateProblemSummary[];
  isAdmin: boolean;
};

const EXAM_BADGE: Record<DoctorateExamType, string> = {
  general:
    'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  specialist: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
};

const TABS: Array<{ value: 'all' | DoctorateExamType; label: string }> = [
  { value: 'all', label: 'All Problems' },
  { value: 'general', label: 'General Exam' },
  { value: 'specialist', label: 'Specialist Exam' },
];

export default function DoctorateExamsExplorer({ problems, isAdmin }: Props) {
  const [examType, setExamType] = useState<'all' | DoctorateExamType>('all');
  const [year, setYear] = useState<string>('all');
  const [specialty, setSpecialty] = useState<string>('all');
  const [search, setSearch] = useState('');

  const years = useMemo(
    () => [...new Set(problems.map((p) => p.year))].sort((a, b) => b - a),
    [problems],
  );

  const specialties = useMemo(
    () =>
      [...new Set(problems.map((p) => p.specialty).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [problems],
  );

  const stats = useMemo(
    () => ({
      total: problems.length,
      years: years.length,
      solved: problems.filter((p) => p.hasSolution).length,
      general: problems.filter((p) => p.examType === 'general').length,
      specialist: problems.filter((p) => p.examType === 'specialist').length,
    }),
    [problems, years],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return problems.filter((p) => {
      if (examType !== 'all' && p.examType !== examType) return false;
      if (year !== 'all' && String(p.year) !== year) return false;
      if (specialty !== 'all' && p.specialty !== specialty) return false;
      if (q) {
        const haystack =
          `${p.title} ${p.specialty} ${p.university} ${p.tags.join(' ')} ${p.year}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [problems, examType, year, specialty, search]);

  const grouped = useMemo(() => {
    const map = new Map<number, DoctorateProblemSummary[]>();
    for (const p of filtered) {
      const list = map.get(p.year) ?? [];
      list.push(p);
      map.set(p.year, list);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  const selectClass =
    'rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs ' +
    'text-[var(--color-text-secondary)] outline-none transition-colors focus:border-[var(--color-accent)]';

  return (
    <div className="pb-20 pt-20 md:pt-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <header className="mb-10">
          <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            <GraduationCap size={14} aria-hidden="true" />
            Doctorate Entrance Exams — Algeria
          </p>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-serif text-3xl font-semibold leading-tight text-[var(--color-text)] md:text-4xl">
              Doctorate Exam Archive
            </h1>
            {isAdmin && (
              <Link
                href="/admin/doctorate-exams"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <Settings2 size={13} aria-hidden="true" />
                Manage Exams
              </Link>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
            Past problems from the Algerian mathematics doctorate entrance
            exams — both the <strong>general exam</strong> and the{' '}
            <strong>specialist exam</strong> held every year — collected with
            sources and complete, carefully written solutions to help you
            prepare. Every exam can be downloaded as a PDF with all of its
            solutions.
          </p>
        </header>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              <BookOpenCheck size={12} aria-hidden="true" /> Problems
            </div>
            <p className="text-xl font-semibold text-[var(--color-text)]">
              {stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              <CalendarDays size={12} aria-hidden="true" /> Years Covered
            </div>
            <p className="text-xl font-semibold text-[var(--color-text)]">
              {stats.years}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              <CheckCircle2 size={12} aria-hidden="true" /> With Solutions
            </div>
            <p className="text-xl font-semibold text-[var(--color-text)]">
              {stats.solved}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              <Award size={12} aria-hidden="true" /> General / Specialist
            </div>
            <p className="text-xl font-semibold text-[var(--color-text)]">
              {stats.general}
              <span className="text-[var(--color-text-tertiary)]"> / </span>
              {stats.specialist}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setExamType(tab.value)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  examType === tab.value
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search problems, topics, universities…"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-9 pr-3 text-xs text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]"
              />
            </div>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={selectClass}
              aria-label="Filter by year"
            >
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className={selectClass}
              aria-label="Filter by specialty"
            >
              <option value="all">All specialties</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Problems grouped by year */}
        {grouped.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
            <GraduationCap
              size={28}
              className="mx-auto mb-3 text-[var(--color-text-tertiary)]"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-[var(--color-text)]">
              {problems.length === 0
                ? 'The archive is being prepared'
                : 'No problems match your filters'}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {problems.length === 0
                ? 'Past exam problems and solutions will appear here soon.'
                : 'Try clearing the search or choosing different filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.map(([groupYear, items]) => {
              const typesInYear = [
                ...new Set(items.map((i) => i.examType)),
              ] as DoctorateExamType[];

              return (
                <section key={groupYear}>
                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="font-serif text-xl font-semibold text-[var(--color-text)]">
                      {groupYear}
                    </h2>
                    <span className="h-px flex-1 bg-[var(--color-border)]" />
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      {items.length} problem{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Download the full exam + solutions */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {typesInYear.map((t) => (
                      <Link
                        key={t}
                        href={`/doctorate-exams/download/${groupYear}-${t}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      >
                        <Download size={11} aria-hidden="true" />
                        Download {EXAM_TYPE_LABELS[t]} {groupYear} + Solutions
                        (PDF)
                      </Link>
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {items.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/doctorate-exams/${p.slug}`}
                        className="group flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-hover)]"
                      >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${EXAM_BADGE[p.examType]}`}
                          >
                            {EXAM_TYPE_LABELS[p.examType]}
                          </span>
                          {p.problemNumber ? (
                            <span className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                              Problem {p.problemNumber}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                            {DIFFICULTY_LABELS[p.difficulty] ?? p.difficulty}
                          </span>
                        </div>

                        <h3 className="mb-1.5 font-serif text-base font-medium leading-snug text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] line-clamp-2">
                          {p.title}
                        </h3>

                        <p className="mb-3 text-xs text-[var(--color-text-tertiary)]">
                          {p.specialty}
                          {p.university ? ` • ${p.university}` : ''}
                        </p>

                        <div className="mt-auto flex items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            {p.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          {p.hasSolution && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-emerald-400">
                              <CheckCircle2 size={11} aria-hidden="true" />
                              Solution
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
