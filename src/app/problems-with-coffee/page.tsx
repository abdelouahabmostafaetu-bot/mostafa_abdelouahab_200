import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ensureSampleCoffeeProblem,
  mapCoffeeProblemSummary,
} from '@/lib/coffee-problems';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import type { CoffeeProblemSummary } from '@/types/coffee-problem';

export const metadata: Metadata = {
  title: 'Problems with Coffee | Abdelouahab Mostafa',
  description: 'One coffee. One problem. One idea.',
};

const PAGE_SIZE = 50;

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

function LevelBadge({ level }: { level: string }) {
  return (
    <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-accent)]">
      {level}
    </span>
  );
}

function ProblemCard({ problem }: { problem: CoffeeProblemSummary }) {
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-accent)]/50 sm:p-4">
      {problem.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={problem.coverImage}
          alt=""
          className="mb-4 aspect-[16/9] w-full rounded-md object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <LevelBadge level={problem.level} />
        <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
          {problem.estimatedTime}
        </span>
      </div>
      <h2 className="mt-3 text-base font-semibold leading-snug text-[var(--color-text)]">
        {problem.title}
      </h2>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">
        {problem.shortDescription}
      </p>
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
  await ensureSampleCoffeeProblem();

  const query: Record<string, unknown> = { published: true };

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { title: regex },
      { slug: regex },
      { shortDescription: regex },
      { tags: regex },
    ];
  }

  if (['beginner', 'intermediate', 'advanced'].includes(level)) {
    query.level = level;
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

  return {
    problems: docs.map((doc) =>
      mapCoffeeProblemSummary(doc as Parameters<typeof mapCoffeeProblemSummary>[0]),
    ),
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            One coffee. One problem. One idea.
          </p>
          <h1
            className="text-3xl font-semibold leading-tight sm:text-5xl"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Problems with Coffee
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            A calm place for mathematical problems, slow thinking, and clear solutions.
          </p>
        </header>

        <form
          action="/problems-with-coffee"
          className="mt-6 grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:grid-cols-[1fr_160px_160px_auto]"
        >
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by idea, title, or tag"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <select
            name="level"
            defaultValue={level}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <input
            name="tag"
            defaultValue={tag}
            placeholder="Tag"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#0f0e0d] hover:opacity-90"
          >
            Filter
          </button>
        </form>

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
