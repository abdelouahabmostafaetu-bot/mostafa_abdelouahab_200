import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Download,
  Hourglass,
} from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import MDXContent from '@/components/MDXContent';
import SolutionReveal from '@/components/doctorate/SolutionReveal';
import {
  DIFFICULTY_LABELS,
  EXAM_TYPE_LABELS,
  type DoctorateDifficulty,
  type DoctorateExamType,
} from '@/types/doctorate-problem';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ exam: string }> };

type LeanProblem = {
  _id: unknown;
  title: string;
  slug: string;
  specialty: string;
  university: string;
  source: string;
  problemNumber?: number;
  statement: string;
  solution: string;
  difficulty: DoctorateDifficulty;
};

function parseExam(
  exam: string,
): { year: number; examType: DoctorateExamType } | null {
  const m = /^(\d{4})-(general|specialist)$/.exec(exam);
  if (!m) return null;
  return { year: Number(m[1]), examType: m[2] as DoctorateExamType };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { exam } = await params;
  const parsed = parseExam(exam);
  if (!parsed) return { title: 'Exam Not Found' };
  return {
    title: `${EXAM_TYPE_LABELS[parsed.examType]} ${parsed.year} | Doctorate Exam Archive`,
    description: `Complete ${parsed.year} Algerian mathematics doctorate ${EXAM_TYPE_LABELS[parsed.examType].toLowerCase()} — every problem with a full solution.`,
  };
}

export default async function DoctorateExamViewPage({ params }: PageProps) {
  const { exam } = await params;
  const parsed = parseExam(exam);
  if (!parsed) notFound();

  const user = await getSessionUser();

  let problems: LeanProblem[] = [];
  try {
    await connectToDatabase();
    problems = (await DoctorateProblem.find({
      published: true,
      year: parsed.year,
      examType: parsed.examType,
    })
      .sort({ problemNumber: 1, createdAt: 1 })
      .select(
        'title slug specialty university source problemNumber statement solution difficulty',
      )
      .lean()) as unknown as LeanProblem[];
  } catch (err) {
    console.error('Exam view: DB error:', err);
  }

  if (problems.length === 0) {
    notFound();
  }

  const first = problems[0];
  const examLabel = EXAM_TYPE_LABELS[parsed.examType];
  const examBadgeClass =
    parsed.examType === 'general'
      ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
      : 'border-sky-500/40 bg-sky-500/10 text-sky-300';

  return (
    <div className="pb-20 pt-20 md:pt-28">
      <div className="mx-auto max-w-[760px] px-5 md:px-8">
        {/* Back */}
        <Link
          href="/doctorate-exams"
          className="mb-10 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft size={12} aria-hidden="true" />
          Exam Archive
        </Link>

        {/* Exam header */}
        <header className="mb-12">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${examBadgeClass}`}
            >
              {examLabel}
            </span>
            <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] text-[var(--color-text-tertiary)]">
              {parsed.year}
            </span>
            <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] text-[var(--color-text-tertiary)]">
              {problems.length} exercice{problems.length !== 1 ? 's' : ''}
            </span>
          </div>

          <h1 className="mb-3 font-serif text-[1.9rem] font-normal leading-[1.2] text-[var(--color-text)] md:text-[2.4rem]">
            {examLabel} — {parsed.year}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
            <span>{first.specialty}</span>
            {first.university && (
              <span className="inline-flex items-center gap-1">
                <Building2 size={11} aria-hidden="true" />
                {first.university}
              </span>
            )}
          </div>

          {first.source && (
            <p className="mt-4 flex items-start gap-1.5 text-xs italic leading-5 text-[var(--color-text-tertiary)]">
              <BookOpen
                size={12}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              {first.source}
            </p>
          )}

          <div className="mt-5">
            {user ? (
              <a
                href={`/api/doctorate-exams/pdf/${exam}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90"
              >
                <Download size={13} aria-hidden="true" />
                Download exam + all solutions (PDF)
              </a>
            ) : (
              <Link
                href={`/sign-in?redirect_url=${encodeURIComponent(`/api/doctorate-exams/pdf/${exam}`)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <Download size={13} aria-hidden="true" />
                Sign in to download
              </Link>
            )}
          </div>
        </header>

        {/* All problems of the exam */}
        <div className="space-y-14">
          {problems.map((p, i) => {
            const n = p.problemNumber ?? i + 1;
            const hasSolution = Boolean(String(p.solution ?? '').trim());
            return (
              <section
                key={p.slug}
                className="border-t border-[var(--color-border)] pt-10"
              >
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <h2 className="font-serif text-xl font-semibold text-[var(--color-text)]">
                    Exercice {n}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                    <Hourglass size={10} aria-hidden="true" />
                    {DIFFICULTY_LABELS[p.difficulty] ?? p.difficulty}
                  </span>
                </div>

                <div className="notes-reading">
                  <MDXContent content={p.statement} />
                </div>

                {hasSolution ? (
                  <SolutionReveal>
                    <MDXContent content={p.solution} />
                  </SolutionReveal>
                ) : (
                  <div className="mt-8 rounded-xl border border-dashed border-[var(--color-border)] px-5 py-5 text-center">
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      Solution coming soon
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                      The worked solution for this exercice is being prepared.
                    </p>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Back */}
        <div className="mt-14 border-t border-[var(--color-border)] pt-6">
          <Link
            href="/doctorate-exams"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to the exam archive
          </Link>
        </div>
      </div>
    </div>
  );
}
