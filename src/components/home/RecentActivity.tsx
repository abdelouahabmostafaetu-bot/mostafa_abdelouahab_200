import Link from 'next/link';
import SiteIcon from '@/components/ui/SiteIcon';
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
    <section className="pb-16 md:pb-24">
      <div className="academic-shell">
        <div className="mb-8 flex flex-col gap-3 border-t border-[var(--color-border)] pt-10 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="academic-kicker mb-3">
              <SiteIcon name="notebook" alt="" className="h-4 w-4" />
              Recent work
            </p>
            <h2 className="academic-title text-3xl leading-tight md:text-5xl">
              Publications, notes, and problems
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">
            A stable academic index for articles, mathematical notes, and selected exercises.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {postsWithHtml.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                {postsWithHtml.map((post) => (
                  <article key={post.slug} className="academic-card group rounded-3xl p-6 transition-transform duration-150 hover:-translate-y-0.5">
                    <Link href={`/blog/${post.slug}`} prefetch className="block">
                      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                        <SiteIcon name="document" alt="" className="h-4 w-4" />
                        <span>{post.category}</span>
                      </div>
                      <h3
                        className="blog-card-title text-2xl font-semibold leading-tight text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]"
                        dangerouslySetInnerHTML= __html: post.titleHtml 
                      />
                      <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                        {post.excerpt}
                      </p>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="academic-card rounded-3xl p-6">
                <p className="inline-flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <SiteIcon name="document" alt="" className="h-4 w-4" />
                  No publications yet.
                </p>
                {adminUser ? (
                  <Link
                    href="/blog/admin"
                    className="mt-4 inline-flex rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    Write the first post
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          <aside className="academic-card rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              <SiteIcon name="math" alt="" className="h-4 w-4" />
              Latest problem
            </div>

            {latestProblem && latestProblemHtml ? (
              <Link href={`/problems-with-coffee/${latestProblem.slug}`} prefetch className="group block">
                <h3
                  className="latest-problem-title text-2xl font-semibold leading-tight text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]"
                  dangerouslySetInnerHTML= __html: latestProblemHtml.title 
                />
                <p
                  className="latest-problem-summary mt-4 line-clamp-4 text-sm leading-7 text-[var(--color-text-secondary)]"
                  dangerouslySetInnerHTML= __html: latestProblemHtml.shortDescription 
                />
                <div className="mt-5 flex flex-wrap gap-2">
                  {(latestProblem.tags.length > 0 ? latestProblem.tags.slice(0, 3) : [latestProblem.difficulty]).map((tag) => (
                    <span key={tag} className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ) : (
              <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                No problem published yet.
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
