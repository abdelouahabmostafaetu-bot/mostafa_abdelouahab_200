import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  Hourglass,
} from 'lucide-react';
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

type PageProps = { params: Promise<{ slug: string }> };

type LeanProblem = {
  _id: unknown;
  title: string;
  slug: string;
  examType: DoctorateExamType;
  specialty: string;
  year: number;
  university: string;
  source: string;
  problemNumber?: number;
  statement: string;
  solution: string;
  tags: string[];
  difficulty: DoctorateDifficulty;
  createdAt: Date | string;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    await connectToDatabase();
    const problem = (await DoctorateProblem.findOne({
      slug,
      published: true,
    }).lean()) as LeanProblem | null;
    if (!problem) return { title: 'Problem Not Found' };
    return {
      title: `${problem.title} (${problem.year}) | Doctorate Exam Archive`,
      description: `${EXAM_TYPE_LABELS[problem.examType]} ${problem.year} — ${problem.specialty}. Past Algerian mathematics doctorate exam problem with a complete solution.`,
    };
  } catch {
    return { title: 'Doctorate Exam Archive' };
  }
}

export default async function DoctorateProblemPage({ params }: PageProps) {
  const { slug } = await params;

  let problem: LeanProblem | null = null;
  let related: LeanProblem[] = [];

  try {
    await connectToDatabase();
    problem = (await DoctorateProblem.findOne({
      slug,
      published: true,
    }).lean()) as LeanProblem | null;

    if (problem) {
      related = (await DoctorateProblem.find({
        published: true,
        year: problem.year,
        examType: problem.examType,
        slug: { $ne: problem.slug },
      })
        .sort({ problemNumber: 1, createdAt: -1 })
        .select('title slug examType specialty year problemNumber difficulty')
        .limit(4)
        .lean()) as unknown as LeanProblem[];
    }
  } catch (err) {
    console.error('Doctorate problem detail: DB error:', err);
  }

  if (!problem) {
    notFound();
  }

  const hasSolution = Boolean(String(problem.solution ?? '').trim());
  const examBadgeClass =
    problem.examType === 'general'
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

        <article>
          {/* Header */}
          <header className="mb-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${examBadgeClass}`}
              >
                {EXAM_TYPE_LABELS[problem.examType]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] text-[var(--color-text-tertiary)]">
                <CalendarDays size={10} aria-hidden="true" />
                {problem.year}
              </span>
              {problem.problemNumber ? (
                <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] text-[var(--color-text-tertiary)]">
                  Problem {problem.problemNumber}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] text-[var(--color-text-tertiary)]">
                <Hourglass size={10} aria-hidden="true" />
                {DIFFICULTY_LABELS[problem.difficulty] ?? problem.difficulty}
              </span>
            </div>

            <h1 className="mb-3 font-serif text-[1.9rem] font-normal leading-[1.2] text-[var(--color-text)] md:text-[2.4rem]">
              {problem.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
              <span>{problem.specialty}</span>
              {problem.university && (
                <span className="inline-flex items-center gap-1">
                  <Building2 size={11} aria-hidden="true" />
                  {problem.university}
                </span>
              )}
            </div>
          </header>

          {/* Problem statement */}
          <section>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">
              Problem Statement
            </p>
            <div className="notes-reading">
              <MDXContent content={problem.statement} />
            </div>
          </section>

          {/* Solution */}
          {hasSolution ? (
            <SolutionReveal>
              <MDXContent content={problem.solution} />
            </SolutionReveal>
          ) : (
            <div className="mt-12 rounded-xl border border-dashed border-[var(--color-border)] px-5 py-6 text-center">
              <p className="text-sm font-medium text-[var(--color-text)]">
                Solution coming soon
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                A complete worked solution for this problem is being prepared.
              </p>
            </div>
          )}

          {/* Source */}
          {problem.source && (
            <div className="mt-10 border-t border-[var(--color-border)] pt-6">
              <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-tertiary)]">
                <BookOpen size={11} aria-hidden="true" />
                Source
              </p>
              <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                {problem.source}
              </p>
            </div>
          )}

          {/* Tags */}
          {problem.tags && problem.tags.length > 0 && (
            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <div className="flex flex-wrap gap-2">
                {problem.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Related problems from the same exam */}
        {related.length > 0 && (
          <div className="mt-14 border-t border-[var(--color-border)] pt-8">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-tertiary)]">
              More From the {problem.year}{' '}
              {EXAM_TYPE_LABELS[problem.examType]}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={String(r._id)}
                  href={`/doctorate-exams/${r.slug}`}
                  className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-hover)]"
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    {r.problemNumber
                      ? `Problem ${r.problemNumber}`
                      : r.specialty}
                  </p>
                  <h4 className="font-serif text-sm font-normal text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] line-clamp-2">
                    {r.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        )}

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
