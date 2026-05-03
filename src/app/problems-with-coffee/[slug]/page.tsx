import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPublishedProblemQuery, mapProblem } from '@/lib/problems';
import {
  renderInlineMarkdownPreviewToHtml,
  renderMarkdownPreviewToHtml,
} from '@/lib/mdx-preview';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import type { Problem } from '@/types/problem';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function markdownToHtml(value: string) {
  if (!value.trim()) return '';
  return renderMarkdownPreviewToHtml(value);
}

async function loadProblem(slug: string): Promise<Problem | null> {
  await connectToDatabase();

  const problem = await CoffeeProblemModel.findOne({
    slug,
    ...buildPublishedProblemQuery(),
  }).lean();
  return problem ? mapProblem(problem) : null;
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
    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
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
      className={`rounded-xl border px-4 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:px-6 sm:py-7 md:px-8 md:py-8 ${
        accent
          ? 'border-[var(--color-accent)]/25 bg-[linear-gradient(180deg,rgba(243,107,22,0.09),rgba(39,39,43,0.86))]'
          : 'border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(39,39,43,0.88))]'
      }`}
    >
      <h2 className="mb-5 border-b border-[var(--color-border)] pb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
        {title}
      </h2>
      <div
        className="problem-content problem-article-content prose-academic"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

export default async function CoffeeProblemDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let problem: Problem | null = null;

  try {
    problem = await loadProblem(slug);
  } catch {
    notFound();
  }

  if (!problem) notFound();

  const [problemHtml, solutionHtml] = await Promise.all([
    markdownToHtml(problem.fullProblemContent),
    markdownToHtml(problem.solutionContent),
  ]);
  const [titleHtml, shortDescriptionHtml] = await Promise.all([
    renderInlineMarkdownPreviewToHtml(problem.title),
    renderInlineMarkdownPreviewToHtml(problem.shortDescription),
  ]);

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-[900px] border-b border-[var(--color-border)] pb-8 md:pb-10">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              Problems with Coffee
            </p>
            <h1
              className="problem-title max-w-[900px] text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.1] tracking-normal text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-serif)' }}
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
            <p
              className="mt-5 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base sm:leading-8"
              dangerouslySetInnerHTML={{ __html: shortDescriptionHtml }}
            />
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Badge>{problem.difficulty}</Badge>
              <Badge>{problem.estimatedTime}</Badge>
              {problem.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
        </header>

        <main className="mx-auto mt-8 max-w-[900px] space-y-7 md:mt-10">
          <HtmlSection title="Problem" html={problemHtml} />
          <HtmlSection title="Solution" html={solutionHtml} accent />

          <div className="border-t border-[var(--color-border)] pt-6">
            <Link
              href="/problems-with-coffee"
              className="inline-flex rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
            >
              Back to Problems with Coffee
            </Link>
          </div>
        </main>
      </div>
    </section>
  );
}
