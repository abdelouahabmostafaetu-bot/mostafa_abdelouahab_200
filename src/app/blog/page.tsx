import type { Metadata } from 'next';
import PostCard from '@/components/blog/PostCard';
import { getBlogPosts, getAllTags } from '@/lib/content';
import TagFilter from '@/components/blog/TagFilter';
import Pagination from '@/components/blog/Pagination';

const POSTS_PER_PAGE = 15;

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Articles on mathematics, research notes, tutorials, and more.',
};

export default function BlogPage({
  searchParams,
}: {
  searchParams: { tag?: string; page?: string };
}) {
  const allPosts = getBlogPosts();
  const allTags = getAllTags();
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
    <div className="pt-28 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="mb-10 fade-in-up">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-accent)] font-medium mb-3">
            Writing
          </p>
          <h1
            className="text-4xl font-semibold text-[var(--color-text)] mb-4"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Blog
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">
            {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
            {activeTag ? ` tagged "${activeTag}"` : ''}
            {totalPages > 1 ? ` \u00b7 Page ${safePage} of ${totalPages}` : ''}
          </p>
        </div>

        {/* Tag Filter */}
        <TagFilter tags={allTags} activeTag={activeTag} />

        {/* Posts */}
        {posts.length > 0 ? (
          <div>
            {posts.map((post, index) => (
              <PostCard
                key={post.slug}
                slug={post.slug}
                title={post.title}
                date={post.date}
                category={post.category}
                excerpt={post.excerpt}
                readingTime={post.readingTime}
                tags={post.tags}
                isLast={index === posts.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] text-center py-20">
            <p className="text-sm text-[var(--color-text-secondary)]">
              No posts found for this tag.
            </p>
          </div>
        )}

        {/* Pagination */}
        <Pagination currentPage={safePage} totalPages={totalPages} activeTag={activeTag} />
      </div>
    </div>
  );
}
