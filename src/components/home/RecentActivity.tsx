import Link from 'next/link';
import SiteIcon from '@/components/ui/SiteIcon';
import { getCurrentAdminUser } from '@/lib/admin';
import { getBlogPosts } from '@/lib/content';
import { renderInlineMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import { getLatestPublishedProblem } from '@/lib/problems';

export default async function RecentActivity() {
  const [posts, latestProblem] = await Promise.all([
    getBlogPosts().then((blogPosts) => blogPosts.slice(0, 1)),
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
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <div className="mb-8 flex items-baseline justify-between border-b border-[var(--color-border)] pb-4 md:mb-12">
          <h2
            className="inline-flex items-center gap-2 text-2xl font-normal text-[var(--color-text)] md:gap-3 md:text-4xl"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            <SiteIcon name="notebook" alt="" className="h-5 w-5 md:h-7 md:w-7" />
            Publications & Notes
          </h2>
        </div>

        <div className="space-y-7 md:space-y-10">
          {postsWithHtml.length > 0 ? (
            postsWithHtml.map((post) => (
              <article key={post.slug} className="group border-b border-[var(--color-border)] pb-7 md:pb-8">
                <Link
                  href={`/blog/${post.slug}`}
                  prefetch
                  className="block cursor-pointer transition-opacity duration-150 active:opacity-80"
                >
                    <header className="mb-2">
                    <div className="flex items-center text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-medium mb-3">
                      <SiteIcon name="document" alt="" className="mr-2 h-3.5 w-3.5" />
                      <span>{post.category}</span>
                    </div>
                    <h3
                      className="blog-card-title mb-2 text-xl font-normal text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] md:mb-4 md:text-3xl"
                      style={{ fontFamily: 'var(--font-serif)' }}
                      dangerouslySetInnerHTML={{ __html: post.titleHtml }}
                    />
                  </header>
                  <p className="line-clamp-2 max-w-3xl text-[14px] leading-7 text-[var(--color-text-secondary)] md:line-clamp-none md:text-base md:leading-8">
                    {post.excerpt}
                  </p>
                </Link>
              </article>
            ))
          ) : (
            <div>
              <p className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] italic">
                <SiteIcon name="document" alt="" className="h-4 w-4" />
                No publications yet.
              </p>
              {adminUser ? (
                <Link
                  href="/blog/admin"
                  className="mt-4 inline-flex rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  Write the first post
                </Link>
              ) : null}
            </div>
          )}
        </div>

        {latestProblem ? (
          <div className="mt-9 md:mt-12">
            <article className="group border-b border-[var(--color-border)] pb-7 md:pb-8">
              <Link
                href={`/problems-with-coffee/${latestProblem.slug}`}
                prefetch
                className="block cursor-pointer transition-opacity duration-150 active:opacity-80"
              >
                  <header className="mb-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-medium mb-3">
                    <span className="inline-flex items-center">
                      <SiteIcon name="math" alt="" className="mr-2 h-3.5 w-3.5" />
                      {latestProblem.tags[0] ?? latestProblem.difficulty}
                    </span>
                    {latestProblem.estimatedTime ? <span>{latestProblem.estimatedTime}</span> : null}
                  </div>
                  <h3
                     className="latest-problem-title mb-2 text-xl font-normal text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] md:mb-4 md:text-3xl"
                    style={{ fontFamily: 'var(--font-serif)' }}
                    dangerouslySetInnerHTML={{ __html: latestProblemHtml?.title ?? '' }}
                  />
                </header>
                <p
                  className="latest-problem-summary line-clamp-2 max-w-3xl text-[14px] leading-7 text-[var(--color-text-secondary)] md:line-clamp-none md:text-base md:leading-8"
                  dangerouslySetInnerHTML={{
                    __html: latestProblemHtml?.shortDescription ?? '',
                  }}
                />
              </Link>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}
