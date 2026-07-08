import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Download, Hourglass, Lock } from 'lucide-react';
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
  year: number;
  examType: DoctorateExamType;
  problemNumber?: number;
  statement: string;
  solution: string;
  difficulty: DoctorateDifficulty;
};

type ParsedExam =
  | { examId: number }
  | { year: number; examType: DoctorateExamType };

function parseExam(exam: string): ParsedExam | null {
  if (/^\d+$/.test(exam)) return { examId: Number(exam) };
  const m = /^(\d{4})-(general|specialist)$/.exec(exam);
  if (!m) return null;
  return { year: Number(m[1]), examType: m[2] as DoctorateExamType };
}

function buildQuery(parsed: ParsedExam): Record<string, unknown> {
  return 'examId' in parsed
    ? { published: true, examId: parsed.examId }
    : { published: true, year: parsed.year, examType: parsed.examType };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { exam } = await params;
  const parsed = parseExam(exam);
  if (!parsed) return { title: 'Exam Not Found' };
  if ('year' in parsed) {
    return {
      title: `${EXAM_TYPE_LABELS[parsed.examType]} ${parsed.year} | Doctorate Exam Archive`,
      description: `Complete ${parsed.year} Algerian mathematics doctorate ${EXAM_TYPE_LABELS[parsed.examType].toLowerCase()} — every problem with a full solution.`,
    };
  }
  return {
    title: 'Doctorate Exam | Archive',
    description:
      'A complete Algerian mathematics doctorate entrance exam — every problem with a full solution.',
  };
}

/** Color-coded exam-type tag using accent variants only. */
function ExamTypeTag({ type }: { type: DoctorateExamType }) {
  const isGeneral = type === 'general';
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-full)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ring-1 ring-inset ${
        isGeneral
          ? 'bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent-muted)]'
          : 'bg-[var(--surface-raised)] text-[var(--accent-strong)] ring-[var(--border-strong)]'
      }`}
    >
      {EXAM_TYPE_LABELS[type]}
    </span>
  );
}

export default async function DoctorateExamViewPage({ params }: PageProps) {
  const { exam } = await params;
  const parsed = parseExam(exam);
  if (!parsed) notFound();

  const user = await getSessionUser();

  let problems: LeanProblem[] = [];
  try {
    await connectToDatabase();
    problems = (await DoctorateProblem.find(buildQuery(parsed))
      .sort({ problemNumber: 1, createdAt: 1 })
      .select(
        'title slug specialty university source year examType problemNumber statement solution difficulty',
      )
      .lean()) as unknown as LeanProblem[];
  } catch (err) {
    console.error('Exam view: DB error:', err);
  }

  if (problems.length === 0) {
    notFound();
  }

  const first = problems[0];
  const year = first.year;
  const examType = first.examType;
  const examLabel = EXAM_TYPE_LABELS[examType];

  return (
    <div className="mx-auto max-w-content px-4 py-8 sm:px-6 md:py-12">
      {/* Back */}
      <Link
        href="/doctorate-exams"
        className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-sm)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Exam Archive
      </Link>

      {/* ===== Exam header ===== */}
      <header className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <ExamTypeTag type={examType} />
          <span className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-2.5 py-1 text-sm font-semibold text-[var(--text)]">
            {year}
          </span>
          <span className="text-sm text-[var(--text-subtle)]">
            {problems.length} exercice{problems.length !== 1 ? 's' : ''}
          </span>
        </div>

        <h1 className="mt-4 font-serif text-3xl leading-tight text-[var(--text)] sm:text-4xl">
          {examLabel} — {year}
        </h1>

        <div className="mt-3 flex flex-col gap-1.5 text-[0.95rem] text-[var(--text-muted)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
          <span>{first.specialty}</span>
          {first.university && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-[var(--text-subtle)]" aria-hidden="true" />
              {first.university}
            </span>
          )}
        </div>

        {first.source && (
          <p className="mt-3 text-sm italic text-[var(--text-subtle)]">
            {first.source}
          </p>
        )}

        <div className="mt-6 border-t border-[var(--border)] pt-6">
          {user ? (
            <Link
              href={`/doctorate-exams/download/${exam}`}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--bg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] sm:w-auto motion-reduce:transition-none"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download exam + all solutions (PDF)
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-5 text-sm font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:w-auto motion-reduce:transition-none"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              Sign in to download
            </Link>
          )}
        </div>
      </header>

      {/* ===== Problems ===== */}
      <div className="mt-8 space-y-6">
        {problems.map((p, i) => {
          const n = p.problemNumber ?? i + 1;
          const hasSolution = Boolean(String(p.solution ?? '').trim());
          return (
            <article
              key={String(p._id)}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-xl text-[var(--text)] sm:text-2xl">
                  Exercice {n}
                </h2>
                <span className="inline-flex items-center rounded-[var(--radius-full)] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-subtle)]">
                  {DIFFICULTY_LABELS[p.difficulty] ?? p.difficulty}
                </span>
              </div>

              <div className="prose-academic blog-content mt-4">
                <MDXContent content={p.statement} />
              </div>

              {hasSolution ? (
                <div className="mt-6 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
                  <SolutionReveal>
                    <div className="prose-academic blog-content border-t border-[var(--border)] px-5 py-5">
                      <MDXContent content={p.solution} />
                    </div>
                  </SolutionReveal>
                </div>
              ) : (
                <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-subtle)] px-5 py-4">
                  <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-subtle)]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">
                      Solution coming soon
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                      The worked solution for this exercice is being prepared.
                    </p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Back */}
      <div className="mt-10">
        <Link
          href="/doctorate-exams"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the exam archive
        </Link>
      </div>
    </div>
  );
}
