import Link from 'next/link';
import { getCurrentAdminUser } from '@/lib/admin';
import { getBlogPosts } from '@/lib/content';
import { renderInlineMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import { getLatestPublishedProblem } from '@/lib/problems';

export default async function RecentActivity() {
  const [posts, latestProblem] = await Promise.all([
    getBlogPosts().then((blogPosts) => blogPosts.slice(0, 2)),
    getLatestPublishedProblem(),
  ]);
  const adminUser = await getCurrentAdminUser();
  const postsWithHtml = await Promise.all(
    posts.map(async (post) => ({
      ...post,
      titleHtml: await renderInlineMarkdownPreviewToHtml(post.title),
    })),
  );
  const latestProblemHtml = latestProblem
    ? {
        title: await renderInlineMarkdownPreviewToHtml(latestProblem.title),
        shortDescription: await renderInlineMarkdownPreviewToHtml(
          latestProblem.shortDescription,
        ),
      }
    : null;

  return (
    <section className="py-14 md:py-20">
      <div className="academic-shell">
        <div className="mb-8 flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="academic-kicker">Current work</p>
            <h2 className="academic-title mt-3 text-3xl md:text-4xl">
              Notes, writing, and problems
            </h2>
          </div>
          <Link href="/blog" className="academic-button w-fit">
            Browse writing
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {postsWithHtml.length > 0 ? (
            postsWithHtml.map((post) => (
              <article key={post.slug} className="academic-card group p-6 transition-transform duration-150 hover:-translate-y-0.5 md:p-7">
                <Link href={`/blog/${post.slug}`} prefetch className="block">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                    {post.category}
                  </p>
                  <h3
                    className="blog-card-title mt-3 text-2xl font-semibold transition-colors group-hover:text-[var(--color-accent)]"
                    dangerouslySetInnerHTML= __html: post.titleHtml 
                  />
                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--color-text-secondary)] md:text-base">
                    {post.excerpt}
                  </p>
                  <span className="mt-5 inline-flex text-sm font-semibold text-[var(--color-accent)]">
                    Read article →
                  </span>
                </Link>
              </article>
            ))
          ) : (
            <div className="academic-card p-6 md:p-7">
              <p className="text-[var(--color-text-secondary)]">No publications yet.</p>
              {adminUser ? (
                <Link href="/blog/admin" className="academic-button mt-4">
                  Write the first post
                </Link>
              ) : null}
            </div>
          )}

          {latestProblem ? (
            <article className="academic-card group p-6 transition-transform duration-150 hover:-translate-y-0.5 md:p-7">
              <Link href={`/problems-with-coffee/${latestProblem.slug}`} prefetch className="block">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                  Latest problem
                </p>
                <h3
                  className="latest-problem-title mt-3 text-2xl font-semibold transition-colors group-hover:text-[var(--color-accent)]"
                  dangerouslySetInnerHTML= __html: latestProblemHtml?.title ?? '' 
                />
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
                  <span>{latestProblem.tags[0] ?? latestProblem.difficulty}</span>
                  {latestProblem.estimatedTime ? <span>· {latestProblem.estimatedTime}</span> : null}
                </div>
                <p
                  className="latest-problem-summary mt-4 line-clamp-3 text-sm leading-7 text-[var(--color-text-secondary)] md:text-base"
                  dangerouslySetInnerHTML= __html: latestProblemHtml?.shortDescription ?? '' 
                />
                <span className="mt-5 inline-flex text-sm font-semibold text-[var(--color-accent)]">
                  Open problem →
                </span>
              </Link>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
