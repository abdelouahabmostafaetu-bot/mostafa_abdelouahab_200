/**
 * StatsSection — homepage live statistics bar.
 *
 * Fetches counts for blog posts, math notes, coffee problems, and
 * library books from the database and renders them as a compact row
 * of counters that sit between ProfileSection and RecentActivity.
 *
 * Designed to fail gracefully: if the database is unreachable every
 * counter just shows a dash (—) rather than crashing the page.
 */

import Link from 'next/link';
import { getBlogPosts } from '@/lib/content';
import { connectToDatabase } from '@/lib/mongodb';
import { Note } from '@/lib/models/note';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import BookModel from '@/lib/models/book';
import SiteIcon, { type SiteIconName } from '@/components/ui/SiteIcon';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Stat = {
  value: number | null;
  label: string;
  sublabel: string;
  icon: SiteIconName;
  href: string;
};

/* ─── Data fetching ──────────────────────────────────────────────────────── */

async function safeCount(fn: () => Promise<number>): Promise<number | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function getStats(): Promise<Stat[]> {
  const [postsResult, notesResult, problemsResult, booksResult] = await Promise.allSettled([
    getBlogPosts().then((posts) => posts.length),
    connectToDatabase()
      .then(() => Note.countDocuments({ published: true }))
      .catch(() => null),
    connectToDatabase()
      .then(() =>
        CoffeeProblemModel.countDocuments({
          $or: [{ isPublished: true }, { published: true }],
        }),
      )
      .catch(() => null),
    connectToDatabase()
      .then(() => BookModel.countDocuments({}))
      .catch(() => null),
  ]);

  return [
    {
      value: postsResult.status === 'fulfilled' ? postsResult.value : null,
      label: 'Blog Posts',
      sublabel: 'Articles & Notes',
      icon: 'blog',
      href: '/blog',
    },
    {
      value:
        notesResult.status === 'fulfilled' && notesResult.value !== null
          ? notesResult.value
          : null,
      label: 'Math Notes',
      sublabel: 'Theorems & Definitions',
      icon: 'notebook',
      href: '/notes',
    },
    {
      value:
        problemsResult.status === 'fulfilled' && problemsResult.value !== null
          ? problemsResult.value
          : null,
      label: 'Problems',
      sublabel: 'With Coffee',
      icon: 'math',
      href: '/problems-with-coffee',
    },
    {
      value:
        booksResult.status === 'fulfilled' && booksResult.value !== null
          ? booksResult.value
          : null,
      label: 'Books',
      sublabel: 'Personal Library',
      icon: 'library',
      href: '/library',
    },
  ];
}

/* ─── Single stat card ───────────────────────────────────────────────────── */

function StatCard({ stat }: { stat: Stat }) {
  const displayValue = stat.value !== null && stat.value > 0 ? stat.value : null;

  return (
    <Link
      href={stat.href}
      className="group flex flex-col items-center text-center transition-colors"
    >
      {/* Icon */}
      <SiteIcon
        name={stat.icon}
        alt=""
        className="mb-2 h-4 w-4 opacity-50 transition-opacity group-hover:opacity-80 md:h-5 md:w-5"
      />

      {/* Count */}
      <p
        className="text-2xl font-bold leading-none text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] md:text-3xl"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {displayValue !== null ? displayValue : '—'}
      </p>

      {/* Labels */}
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-text)] md:text-xs">
        {stat.label}
      </p>
      <p className="mt-0.5 hidden text-[9px] text-[var(--color-text-tertiary)] md:block">
        {stat.sublabel}
      </p>
    </Link>
  );
}

/* ─── Divider between stat cards ─────────────────────────────────────────── */
function StatDivider() {
  return (
    <div
      className="hidden h-10 w-px bg-[var(--color-border)] sm:block"
      aria-hidden="true"
    />
  );
}

/* ─── Section ────────────────────────────────────────────────────────────── */

export default async function StatsSection() {
  const stats = await getStats();

  /* Don't render if all values are null (DB completely unreachable) */
  const allNull = stats.every((s) => s.value === null);
  if (allNull) return null;

  return (
    <section
      aria-label="Site statistics"
      className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/30 py-7 md:py-9"
    >
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <div className="flex items-center justify-between gap-4 sm:justify-around sm:gap-0">
          {stats.map((stat, index) => (
            <div key={stat.label} className="contents">
              <StatCard stat={stat} />
              {index < stats.length - 1 && <StatDivider />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
