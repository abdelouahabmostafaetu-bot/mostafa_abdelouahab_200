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

function getProblemDisplayTitle(title: string) {
  const normalizedTitle = title.toLowerCase();

  if (
    normalizedTitle.includes('arccos') &&
    normalizedTitle.includes('arctan') &&
    normalizedTitle.includes('arctanh') &&
    (normalizedTitle.includes('512') || title.includes('π') || title.includes('\\pi'))
  ) {
    return 'A π⁴/512 Integral with arccos, arctan and arctanh';
  }

  return title;
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
  variant,
}: {
  title: string;
  html: string;
  variant: 'problem' | 'solution';
}) {
  if (!html) return null;

  const content = (
    <div
      className={`${variant === 'problem' ? 'problem-content' : 'solution-content'} markdown-content problem-article-content prose-academic`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  return (
    <section
      className={`problem-detail-section ${
        variant === 'problem' ? 'problem-section' : 'solution-section'
      }`}
    >
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)] sm:mb-5">
        {title}
      </h2>
      {variant === 'problem' ? <div className="problem-box">{content}</div> : content}
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
  const displayTitle = getProblemDisplayTitle(problem.title);
  const [titleHtml, shortDescriptionHtml] = await Promise.all([
    renderInlineMarkdownPreviewToHtml(displayTitle),
    renderInlineMarkdownPreviewToHtml(problem.shortDescription),
  ]);

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="problem-page mx-auto w-full max-w-6xl px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-24 lg:px-8">
        <header className="mx-auto max-w-[900px] border-b border-[var(--color-border)] pb-6 md:pb-10">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              Problems with Coffee
            </p>
            <h1
              className="problem-hero-title problem-title max-w-[900px] text-[clamp(1.75rem,8vw,3.8rem)] font-semibold leading-[1.12] tracking-normal text-[var(--color-text)] sm:text-[clamp(2rem,5vw,4rem)]"
              style={{ fontFamily: 'var(--font-serif)' }}
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
            <p
              className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)] sm:mt-5 sm:leading-8"
              dangerouslySetInnerHTML={{ __html: shortDescriptionHtml }}
            />
            <div className="mt-5 flex flex-wrap gap-2 sm:mt-6 sm:gap-2.5">
              <Badge>{problem.difficulty}</Badge>
              <Badge>{problem.estimatedTime}</Badge>
              {problem.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
        </header>

        <main className="problem-detail-container mt-7 space-y-8 md:mt-10">
          <HtmlSection title="Problem" html={problemHtml} variant="problem" />
          <HtmlSection title="Solution" html={solutionHtml} variant="solution" />

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
