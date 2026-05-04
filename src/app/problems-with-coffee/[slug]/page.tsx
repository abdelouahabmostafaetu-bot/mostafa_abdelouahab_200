import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPublishedProblemQuery, mapProblem } from '@/lib/problems';
import { renderMarkdownPreviewToHtml } from '@/lib/mdx-preview';
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
  return renderMarkdownPreviewToHtml(normalizeProblemLatex(value));
}

function normalizeProblemLatex(source: string) {
  return source
    .replace(
      /\\sqrt\s*\\dfrac\{\\sqrt\{1\+x\^4\}-1\}\{x\^2\}/g,
      '\\sqrt{\\dfrac{\\sqrt{1+x^4}-1}{x^2}}',
    )
    .replace(
      /\\sqrt\s*\\frac\{\\sqrt\{1\+x\^4\}-1\}\{x\^2\}/g,
      '\\sqrt{\\dfrac{\\sqrt{1+x^4}-1}{x^2}}',
    );
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
      {variant === 'problem' ? (
        <div className="problem-box">
          <p className="section-kicker">{title}</p>
          {content}
        </div>
      ) : (
        <div className="solution-panel">
          <p className="section-kicker">{title}</p>
          {content}
        </div>
      )}
    </section>
  );
}

export default async function CoffeeProblemDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let problem: Problem | null = null;

  try {
    problem = await loadProblem(slug);
  } catch {
    return notFound();
  }

  if (!problem) {
    return notFound();
  }

  const [problemHtml, solutionHtml] = await Promise.all([
    markdownToHtml(problem.fullProblemContent),
    markdownToHtml(problem.solutionContent),
  ]);

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="problem-page mx-auto w-full px-4 pb-14 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
        <main className="problem-detail-container">
          <HtmlSection title="Problem" html={problemHtml} variant="problem" />
          <HtmlSection title="Solution" html={solutionHtml} variant="solution" />

          <div className="problem-detail-actions">
            <Link
              href="/problems-with-coffee"
              className="problem-detail-back-link"
            >
              Back to Problems with Coffee
            </Link>
          </div>
        </main>
      </div>
    </section>
  );
}
