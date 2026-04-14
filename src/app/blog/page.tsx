import type { Metadata } from 'next';
import PostCard from '@/components/blog/PostCard';
import Tag from '@/components/blog/Tag';
import { getAllTags, getBlogPosts } from '@/lib/content';
import Pagination from '@/components/blog/Pagination';
import Link from 'next/link';

const POSTS_PER_PAGE = 15;

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Articles on mathematics, research notes, tutorials, and more.',
};

export const dynamic = 'force-dynamic';

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { tag?: string; page?: string };
}) {
  const allPosts = await getBlogPosts();
  const allTags = await getAllTags();
  const activeTag = searchParams.tag || '';

  const filteredPosts = activeTag
    ? allPosts.filter((post) => post.tags.includes(activeTag))
    : allPosts;

  const currentPage = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * POSTS_PER_PAGE;
  const posts = filteredPosts.slice(startIdx, startIdx + POSTS_PER_PAGE);

  return (
    <div className="pt-20 pb-20">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-[var(--color-accent)] font-medium mb-2">
                Writing
              </p>
              <h1
                className="text-2xl md:text-4xl font-semibold text-[var(--color-text)] mb-3"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Blog
              </h1>
              <p className="max-w-2xl text-[12px] md:text-sm leading-6 md:leading-7 text-[var(--color-text-secondary)]">
                {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
                {activeTag ? ` tagged "${activeTag}"` : ''}
                {totalPages > 1 ? ` \u00b7 Page ${safePage} of ${totalPages}` : ''}
              </p>
            </div>

            <Link
              href="/blog/admin"
              className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Manage Posts
            </Link>
          </div>

          {allTags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {allTags.map(({ tag, count }) => (
                <Tag key={tag} tag={tag} count={count} active={tag === activeTag} size="sm" />
              ))}
            </div>
          ) : null}
        </div>

        {posts.length > 0 ? (
          <div>
            {posts.map((post, index) => (
              <PostCard
                key={post.slug}
                slug={post.slug}
                title={post.title}
                category={post.category}
                excerpt={post.excerpt}
                readingTime={post.readingTime}
                coverImageUrl={post.coverImageUrl}
                tags={post.tags}
                isLast={index === posts.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {activeTag ? 'No posts found for this tag.' : 'No blog posts yet.'}
            </p>
            {!activeTag ? (
              <Link
                href="/blog/admin"
                className="mt-4 inline-flex rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                Open Blog Admin
              </Link>
            ) : null}
          </div>
        )}

        <Pagination currentPage={safePage} totalPages={totalPages} activeTag={activeTag} />
      </div>
    </div>
  );
}
