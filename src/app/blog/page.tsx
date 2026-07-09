import type { Metadata } from 'next';
import PostCard from '@/components/blog/PostCard';
import Tag from '@/components/blog/Tag';
import { getAllTags, getBlogPosts } from '@/lib/content';
import Pagination from '@/components/blog/Pagination';
import Link from 'next/link';
import { SquarePen } from 'lucide-react';
import { getCurrentAdminUser } from '@/lib/admin';
import { renderInlineMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import Reveal from '@/components/visual/Reveal';
import MathMotif from '@/components/visual/MathMotif';
import CountUp from '@/components/visual/CountUp';

const POSTS_PER_PAGE = 15;

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Articles on mathematics, research notes, tutorials, and more.',
};

export const dynamic = 'force-dynamic';

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const adminUser = await getCurrentAdminUser();
  const allPosts = await getBlogPosts();
  const allTags = await getAllTags(allPosts);
  const activeTag = resolvedSearchParams.tag || '';

  const filteredPosts = activeTag
    ? allPosts.filter((post) => post.tags.includes(activeTag))
    : allPosts;

  const currentPage = Math.max(
    1,
    parseInt(resolvedSearchParams.page || '1', 10) || 1,
  );
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * POSTS_PER_PAGE;
  const posts = await Promise.all(
    filteredPosts
      .slice(startIdx, startIdx + POSTS_PER_PAGE)
      .map(async (post) => ({
        ...post,
        titleHtml: await renderInlineMarkdownPreviewToHtml(post.title),
      })),
  );

  return (
    <div className="mx-auto max-w-wide px-4 py-10 sm:px-6 md:py-14">
      {/* ===== Header ===== */}
      <header className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
        <div className="absolute inset-0 bg-hero-mesh" aria-hidden="true" />
        <MathMotif
          name="fourier"
          opacity={0.1}
          className="absolute -right-4 top-1/2 hidden h-24 -translate-y-1/2 sm:block"
        />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Writing</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-[var(--text)] sm:text-5xl">
              Blog
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-1 text-sm text-[var(--text-muted)]">
              <CountUp
                value={filteredPosts.length}
                className="font-semibold text-[var(--text)]"
              />
              <span>
                {filteredPosts.length !== 1 ? 'posts' : 'post'}
                {activeTag ? ` tagged \u201c${activeTag}\u201d` : ''}
                {totalPages > 1 ? ` \u00b7 Page ${safePage} of ${totalPages}` : ''}
              </span>
            </p>
          </div>

          {adminUser ? (
            <Link
              href="/blog/admin"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
            >
              <SquarePen className="h-4 w-4" aria-hidden="true" />
              Manage Posts
            </Link>
          ) : null}
        </div>
      </header>

      {/* ===== Tag filter ===== */}
      {allTags.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {allTags.map(({ tag, count }) => (
            <Tag key={tag} tag={tag} count={count} active={tag === activeTag} />
          ))}
        </div>
      ) : null}

      {/* ===== Grid ===== */}
      {posts.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <Reveal key={post.slug} className="h-full" delay={(i % 3) * 70}>
              <PostCard {...post} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            {activeTag ? 'No posts found for this tag.' : 'No blog posts yet.'}
          </p>
          {!activeTag && adminUser ? (
            <Link
              href="/blog/admin"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <SquarePen className="h-4 w-4" aria-hidden="true" />
              Open Blog Admin
            </Link>
          ) : null}
        </div>
      )}

      <div className="mt-10">
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          activeTag={activeTag}
        />
      </div>
    </div>
  );
}
