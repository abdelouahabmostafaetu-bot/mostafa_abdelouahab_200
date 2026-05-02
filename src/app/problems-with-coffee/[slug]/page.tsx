import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CoffeeProblemDetailClient from '@/components/problems/CoffeeProblemDetailClient';
import {
  ensureSampleCoffeeProblem,
  mapCoffeeProblem,
} from '@/lib/coffee-problems';
import { renderMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import type { CoffeeProblem } from '@/types/coffee-problem';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function markdownToHtml(value: string) {
  if (!value.trim()) return '';
  return renderMarkdownPreviewToHtml(value);
}

async function loadProblem(slug: string): Promise<CoffeeProblem | null> {
  await connectToDatabase();
  await ensureSampleCoffeeProblem();

  const problem = await CoffeeProblemModel.findOne({ slug, published: true }).lean();
  return problem
    ? mapCoffeeProblem(problem as Parameters<typeof mapCoffeeProblem>[0])
    : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const problem = await loadProblem(slug);
    if (!problem) {
      return {
        title: 'Problem not found | Problems with Coffee',
      };
    }

    return {
      title: `${problem.title} | Problems with Coffee`,
      description: problem.shortDescription,
    };
  } catch {
    return {
      title: 'Problems with Coffee',
    };
  }
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] text-[var(--color-text-secondary)]">
      {children}
    </span>
  );
}

function HtmlSection({
  title,
  html,
  accent = false,
}: {
  title: string;
  html: string;
  accent?: boolean;
}) {
  if (!html) return null;

  return (
    <section
      className={`rounded-lg border p-4 sm:p-5 ${
        accent
          ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
        {title}
      </h2>
      <div
        className="problem-content prose-academic"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

export default async function CoffeeProblemDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let problem: CoffeeProblem | null = null;

  try {
    problem = await loadProblem(slug);
  } catch {
    notFound();
  }

  if (!problem) notFound();

  const [
    problemHtml,
    hint1Html,
    hint2Html,
    keyIdeaHtml,
    solutionHtml,
    lessonHtml,
  ] = await Promise.all([
    markdownToHtml(problem.problemStatement),
    markdownToHtml(problem.hint1),
    markdownToHtml(problem.hint2),
    markdownToHtml(problem.keyIdea),
    markdownToHtml(problem.solution),
    markdownToHtml(problem.lesson),
  ]);

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b border-[var(--color-border)] pb-8 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              Problems with Coffee
            </p>
            <h1
              className="text-3xl font-semibold leading-tight sm:text-5xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {problem.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
              {problem.shortDescription}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>{problem.level}</Badge>
              <Badge>{problem.estimatedTime}</Badge>
              {problem.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
          {problem.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={problem.coverImage}
              alt=""
              className="aspect-[4/3] w-full rounded-lg border border-[var(--color-border)] object-cover"
            />
          ) : null}
        </header>

        <main className="mx-auto mt-8 max-w-3xl space-y-6">
          <HtmlSection title="Problem" html={problemHtml} />

          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-4 text-sm leading-7 text-[var(--color-text-secondary)]">
            <p className="font-semibold text-[var(--color-text)]">
              Before opening the solution, try to think for a few minutes.
            </p>
            <p className="mt-2">
              Take your coffee, read the problem slowly, and try one idea before opening the hints.
            </p>
          </section>

          <CoffeeProblemDetailClient
            hint1={hint1Html ? { title: 'Hint 1', html: hint1Html } : null}
            hint2={hint2Html ? { title: 'Hint 2', html: hint2Html } : null}
            solution={solutionHtml ? { title: 'Solution', html: solutionHtml } : null}
          />

          <HtmlSection title="Key Idea" html={keyIdeaHtml} accent />
          <HtmlSection title="What you should learn" html={lessonHtml} />

          <div className="border-t border-[var(--color-border)] pt-6">
            <Link
              href="/problems-with-coffee"
              className="inline-flex rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Back to Problems with Coffee
            </Link>
          </div>
        </main>
      </div>
    </section>
  );
}
