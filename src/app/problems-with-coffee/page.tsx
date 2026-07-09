import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Coffee, Search, Settings } from 'lucide-react';
import { getCurrentAdminUser } from '@/lib/admin';
import { renderInlineMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import {
  buildPublishedProblemQuery,
  mapProblemSummary,
} from '@/lib/problems';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import type { ProblemSummary } from '@/types/problem';
import Reveal from '@/components/visual/Reveal';
import MathMotif from '@/components/visual/MathMotif';

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

function buildProblemSummaryFallback(source: string) {
  return source
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]/g, ' ')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function ProblemCard({
  problem,
  index,
}: {
  problem: ProblemSummaryWithHtml;
  index: number;
}) {
  // Sparing teal counterpoint: teal only on every third card, gold otherwise.
  const accentVar = index % 3 === 1 ? 'var(--accent-2)' : 'var(--accent)';

  return (
    <Link
      href={`/problems-with-coffee/${problem.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] transition duration-200 ease-out hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--shadow-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accentVar }}
      />
      <div className="flex items-center gap-3 text-xs">
        <span className="font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]">
          Problem {index + 1}
        </span>
        {problem.estimatedTime ? (
          <span className="inline-flex items-center gap-1 text-[var(--text-subtle)]">
            <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
            {problem.estimatedTime}
          </span>
        ) : null}
      </div>

      <h2
        className="mt-3 font-serif text-lg leading-snug text-[var(--text)] transition-colors duration-150 group-hover:text-[var(--accent)]"
        dangerouslySetInnerHTML={{ __html: problem.titleHtml }}
      />
      <div
        className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--text-muted)]"
        dangerouslySetInnerHTML={{ __html: problem.shortDescriptionHtml }}
      />
    </Link>
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
      const summary =
        problem.shortDescription ||
        buildProblemSummaryFallback(
          String(doc.fullProblemContent ?? doc.problemStatement ?? ''),
        );

      return {
        ...problem,
        titleHtml: await renderInlineMarkdownPreviewToHtml(problem.title),
        shortDescriptionHtml: await renderInlineMarkdownPreviewToHtml(summary),
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
    <div className="mx-auto max-w-wide px-4 py-10 sm:px-6 md:py-14">
      {/* ===== Header ===== */}
      <header className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
        <div className="absolute inset-0 bg-hero-mesh" aria-hidden="true" />
        <MathMotif
          name="grid"
          opacity={0.08}
          className="absolute -right-4 top-1/2 hidden h-[130%] -translate-y-1/2 sm:block"
        />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow flex items-center gap-2">
              <Coffee className="h-4 w-4" aria-hidden="true" />
              One coffee. One problem. One idea.
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-[var(--text)] sm:text-5xl">
              Problems with Coffee
            </h1>
            {data.pagination.totalProblems > 0 && (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {data.pagination.totalProblems} problem
                {data.pagination.totalProblems !== 1 ? 's' : ''}
                {data.pagination.totalPages > 1
                  ? ` \u00b7 Page ${data.pagination.page} of ${data.pagination.totalPages}`
                  : ''}
              </p>
            )}
          </div>

          {adminUser ? (
            <Link
              href="/admin/problems-with-coffee"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Admin
            </Link>
          ) : null}
        </div>
      </header>

      {/* ===== Search (maps to the existing ?search=/level=/tag= query) ===== */}
      <form action="/problems-with-coffee" method="get" className="relative mt-8">
        {level ? <input type="hidden" name="level" value={level} /> : null}
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]"
          aria-hidden="true"
        />
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search problems by title or topic…"
          className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-4 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors duration-150 hover:border-[var(--border-strong)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
      </form>

      {warning ? (
        <p className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-muted)]">
          {warning}
        </p>
      ) : null}

      {/* ===== Results ===== */}
      {data.problems.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-full)] bg-[var(--surface)] text-[var(--text-subtle)]">
            <Coffee className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            No published problems found.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {data.problems.map((problem, index) => (
            <Reveal key={problem.slug} className="h-full" delay={(index % 2) * 70}>
              <ProblemCard problem={problem} index={index} />
            </Reveal>
          ))}
        </div>
      )}

      {/* ===== Pagination ===== */}
      <div className="mt-10 flex items-center justify-center gap-4">
        {data.pagination.hasPreviousPage ? (
          <Link
            href={buildPageHref(data.pagination.page - 1, { search, level, tag })}
            className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </Link>
        ) : (
          <span className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm text-[var(--text-subtle)] opacity-40">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </span>
        )}
        <span className="text-sm text-[var(--text-subtle)]">
          Page {data.pagination.page} of {data.pagination.totalPages}
        </span>
        {data.pagination.hasNextPage ? (
          <Link
            href={buildPageHref(data.pagination.page + 1, { search, level, tag })}
            className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm text-[var(--text-subtle)] opacity-40">
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}
