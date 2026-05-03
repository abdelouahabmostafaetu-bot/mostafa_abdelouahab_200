import type { Metadata } from 'next';
import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { getCurrentAdminUser } from '@/lib/admin';
import { renderInlineMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import {
  buildPublishedProblemQuery,
  mapProblemSummary,
} from '@/lib/problems';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import type { ProblemSummary } from '@/types/problem';

export const metadata: Metadata = {
  title: 'Problems with Coffee | Abdelouahab Mostafa',
  description: 'One coffee. One problem. One idea.',
};

const PAGE_SIZE = 50;

type ProblemSummaryWithHtml = ProblemSummary & {
  titleHtml: string;
  shortDescriptionHtml: string;
};

type PageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    level?: string;
    tag?: string;
  }>;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildPageHref(
  page: number,
  params: { search: string; level: string; tag: string },
) {
  const query = new URLSearchParams({ page: String(page) });
  if (params.search) query.set('search', params.search);
  if (params.level) query.set('level', params.level);
  if (params.tag) query.set('tag', params.tag);
  return `/problems-with-coffee?${query.toString()}`;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-accent)]">
      {difficulty}
    </span>
  );
}

function ProblemCard({ problem }: { problem: ProblemSummaryWithHtml }) {
  return (
    <article className="problem-card rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-accent)]/50 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={problem.difficulty} />
        <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
          {problem.estimatedTime}
        </span>
      </div>
      <h2
        className="problem-card-title problem-title mt-3 text-base font-bold leading-[1.35] text-[var(--color-text)]"
        dangerouslySetInnerHTML={{ __html: problem.titleHtml }}
      />
      <p
        className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]"
        dangerouslySetInnerHTML={{ __html: problem.shortDescriptionHtml }}
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {problem.tags.map((tag) => (
          <span
            key={tag}
            className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]"
          >
            {tag}
          </span>
        ))}
      </div>
      <Link
        href={`/problems-with-coffee/${problem.slug}`}
        className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-[#0f0e0d] hover:opacity-90"
      >
        Open Problem
      </Link>
    </article>
  );
}

async function loadProblems({
  page,
  search,
  level,
  tag,
}: {
  page: number;
  search: string;
  level: string;
  tag: string;
}) {
  await connectToDatabase();

  const query: Record<string, unknown> = buildPublishedProblemQuery();

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
      {
        $or: [
          { title: regex },
          { slug: regex },
          { shortDescription: regex },
          { tags: regex },
        ],
      },
    ];
  }

  if (['beginner', 'intermediate', 'advanced'].includes(level)) {
    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
      { $or: [{ level }, { difficulty: level }] },
    ];
  }

  if (tag) {
    query.tags = new RegExp(`^${escapeRegex(tag)}$`, 'i');
  }

  const [docs, totalProblems] = await Promise.all([
    CoffeeProblemModel.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    CoffeeProblemModel.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalProblems / PAGE_SIZE));

  const problems = await Promise.all(
    docs.map(async (doc) => {
      const problem = mapProblemSummary(doc);

      return {
        ...problem,
        titleHtml: await renderInlineMarkdownPreviewToHtml(problem.title),
        shortDescriptionHtml: await renderInlineMarkdownPreviewToHtml(
          problem.shortDescription,
        ),
      };
    }),
  );

  return {
    problems,
    pagination: {
      page,
      totalProblems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export default async function ProblemsWithCoffeePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = getPage(params.page);
  const search = String(params.search ?? '').trim();
  const level = String(params.level ?? '').trim().toLowerCase();
  const tag = String(params.tag ?? '').trim();
  const adminUser = await getCurrentAdminUser();

  let data: Awaited<ReturnType<typeof loadProblems>>;
  let warning = '';

  try {
    data = await loadProblems({ page, search, level, tag });
  } catch {
    data = {
      problems: [],
      pagination: {
        page,
        totalProblems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    warning = 'Problems are temporarily unavailable. Please try again soon.';
  }

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <header className="border-b border-[var(--color-border)] pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1
              className="flex items-center gap-3 text-3xl font-semibold leading-tight sm:text-5xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              <Coffee
                aria-hidden="true"
                className="h-8 w-8 shrink-0 text-[var(--color-accent)] sm:h-10 sm:w-10"
              />
              <span>Problems with Coffee</span>
            </h1>
            {adminUser ? (
              <Link
                href="/admin/problems"
                className="inline-flex w-fit items-center justify-center rounded-md border border-[var(--color-accent)]/40 px-4 py-2 text-sm font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
              >
                Admin
              </Link>
            ) : null}
          </div>
        </header>

        {warning ? (
          <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
            {warning}
          </div>
        ) : null}

        {data.problems.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-[var(--color-border)] px-4 py-14 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              No published problems found.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.problems.map((problem) => (
              <ProblemCard key={problem.slug} problem={problem} />
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {data.pagination.hasPreviousPage ? (
            <Link
              href={buildPageHref(page - 1, { search, level, tag })}
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-accent)]"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm opacity-40">
              Previous
            </span>
          )}
          <span className="text-sm text-[var(--color-text-secondary)]">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          {data.pagination.hasNextPage ? (
            <Link
              href={buildPageHref(page + 1, { search, level, tag })}
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-accent)]"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm opacity-40">
              Next
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
