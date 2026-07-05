'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, GraduationCap } from 'lucide-react';
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
 * DoctorateExamsExplorer — minimal archive: dropdown filters + one clean
 * row per FULL exam (no boxes). Each exam can be opened in full or
 * downloaded as a PDF with all of its solutions.
 */
export default function DoctorateExamsExplorer({ problems }: Props) {
  const exams = useMemo(() => {
    const map = new Map<string, ExamGroup>();
    for (const p of problems) {
      const key = `${p.year}-${p.examType}`;
      const existing = map.get(key);
      if (existing) {
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
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Label */}
        <p className="mb-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          <GraduationCap size={14} aria-hidden="true" />
          Doctorate Entrance Exams — Algeria
        </p>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
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

        {/* Exams */}
        {filtered.length === 0 ? (
          <div className="px-6 py-20 text-center">
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
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((e) => (
              <div
                key={e.key}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 py-7"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-serif text-2xl font-semibold leading-none text-[var(--color-text)]">
                      {e.year}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${EXAM_BADGE[e.examType]}`}
                    >
                      {EXAM_TYPE_LABELS[e.examType]}
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs text-[var(--color-text-tertiary)]">
                    {e.specialty}
                    {e.university ? ` • ${e.university}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/doctorate-exams/exam/${e.key}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90"
                  >
                    View Full Exam
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                  <Link
                    href={`/doctorate-exams/download/${e.key}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
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
