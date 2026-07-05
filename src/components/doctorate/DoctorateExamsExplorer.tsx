'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
} from 'lucide-react';
import {
  EXAM_TYPE_LABELS,
  type DoctorateExamType,
  type DoctorateProblemSummary,
} from '@/types/doctorate-problem';

type Props = { problems: DoctorateProblemSummary[] };

type ExamGroup = {
  key: string; // `${year}-${examType}`
  year: number;
  examType: DoctorateExamType;
  university: string;
  specialty: string;
  problemCount: number;
  solutionCount: number;
};

const EXAM_BADGE: Record<DoctorateExamType, string> = {
  general:
    'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  specialist: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
};

const selectClass =
  'rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-xs ' +
  'text-[var(--color-text-secondary)] outline-none transition-colors focus:border-[var(--color-accent)]';

/**
 * DoctorateExamsExplorer — minimal archive: dropdown filters + one card
 * per FULL exam (not per problem). Each card opens the complete exam
 * or downloads it as a PDF with all solutions.
 */
export default function DoctorateExamsExplorer({ problems }: Props) {
  const exams = useMemo(() => {
    const map = new Map<string, ExamGroup>();
    for (const p of problems) {
      const key = `${p.year}-${p.examType}`;
      const existing = map.get(key);
      if (existing) {
        existing.problemCount += 1;
        if (p.hasSolution) existing.solutionCount += 1;
        if (!existing.university && p.university) {
          existing.university = p.university;
        }
        if (!existing.specialty && p.specialty) {
          existing.specialty = p.specialty;
        }
      } else {
        map.set(key, {
          key,
          year: p.year,
          examType: p.examType,
          university: p.university,
          specialty: p.specialty,
          problemCount: 1,
          solutionCount: p.hasSolution ? 1 : 0,
        });
      }
    }
    return [...map.values()].sort(
      (a, b) => b.year - a.year || a.examType.localeCompare(b.examType),
    );
  }, [problems]);

  const [examType, setExamType] = useState<string>('all');
  const [year, setYear] = useState<string>('all');
  const [university, setUniversity] = useState<string>('all');
  const [specialty, setSpecialty] = useState<string>('all');

  const years = useMemo(
    () => [...new Set(exams.map((e) => e.year))].sort((a, b) => b - a),
    [exams],
  );
  const universities = useMemo(
    () =>
      [...new Set(exams.map((e) => e.university).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [exams],
  );
  const specialties = useMemo(
    () =>
      [...new Set(exams.map((e) => e.specialty).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [exams],
  );

  const filtered = useMemo(
    () =>
      exams.filter((e) => {
        if (examType !== 'all' && e.examType !== examType) return false;
        if (year !== 'all' && String(e.year) !== year) return false;
        if (university !== 'all' && e.university !== university) return false;
        if (specialty !== 'all' && e.specialty !== specialty) return false;
        return true;
      }),
    [exams, examType, year, university, specialty],
  );

  return (
    <div className="pb-20 pt-24 md:pt-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Label */}
        <p className="mb-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          <GraduationCap size={14} aria-hidden="true" />
          Doctorate Entrance Exams — Algeria
        </p>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className={selectClass}
            aria-label="Filter by exam type"
          >
            <option value="all">All exams</option>
            <option value="general">General Exam</option>
            <option value="specialist">Specialist Exam</option>
          </select>
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
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            className={selectClass}
            aria-label="Filter by university"
          >
            <option value="all">All universities</option>
            {universities.map((u) => (
              <option key={u} value={u}>
                {u}
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

        {/* Exam cards */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
            <GraduationCap
              size={28}
              className="mx-auto mb-3 text-[var(--color-text-tertiary)]"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-[var(--color-text)]">
              {exams.length === 0
                ? 'The archive is being prepared'
                : 'No exams match your filters'}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {exams.length === 0
                ? 'Past exams and solutions will appear here soon.'
                : 'Try choosing different filters.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((e) => (
              <div
                key={e.key}
                className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all hover:border-[var(--color-accent)]/50"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${EXAM_BADGE[e.examType]}`}
                  >
                    {EXAM_TYPE_LABELS[e.examType]}
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                    {e.year}
                  </span>
                </div>

                <h2 className="mb-1 font-serif text-lg font-medium leading-snug text-[var(--color-text)]">
                  {EXAM_TYPE_LABELS[e.examType]} — {e.year}
                </h2>

                <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">
                  {e.specialty}
                  {e.university ? ` • ${e.university}` : ''}
                </p>

                <div className="mb-5 flex items-center gap-4 text-[11px] text-[var(--color-text-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText size={12} aria-hidden="true" />
                    {e.problemCount} exercice{e.problemCount !== 1 ? 's' : ''}
                  </span>
                  {e.solutionCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 size={12} aria-hidden="true" />
                      {e.solutionCount} solution
                      {e.solutionCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href={`/doctorate-exams/exam/${e.key}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90"
                  >
                    View Full Exam
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                  <Link
                    href={`/doctorate-exams/download/${e.key}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    <Download size={12} aria-hidden="true" />
                    Download PDF
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
