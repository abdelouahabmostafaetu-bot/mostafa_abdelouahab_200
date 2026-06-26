import Link from 'next/link';
import SiteIcon from '@/components/ui/SiteIcon';
import { getCurrentAdminUser } from '@/lib/admin';
import { getBlogPosts } from '@/lib/content';
import { getLatestPublishedProblem } from '@/lib/problems';

export default async function RecentActivity() {
  const [posts, latestProblem] = await Promise.all([
    getBlogPosts().then((blogPosts) => blogPosts.slice(0, 2)),
    getLatestPublishedProblem(),
  ]);
  const adminUser = await getCurrentAdminUser();

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="university-container">
        <div className="mb-8 flex flex-col gap-3 border-b border-[var(--color-border)] pb-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="university-eyebrow mb-3">
              <SiteIcon name="notebook" alt="" className="h-4 w-4" />
              Academic work
            </p>
            <h2 className="university-heading text-3xl sm:text-4xl">
              Recent writing and problems
            </h2>
          </div>
          <Link
            href="/library"
            className="text-sm font-bold text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Browse full library
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {posts.length > 0 ? (
              posts.map((post) => (
                <article key={post.slug} className="university-card group rounded-2xl p-6 transition-transform duration-150 hover:-translate-y-0.5">
                  <Link href={`/blog/${post.slug}`} prefetch className="block">
                    <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]">
                      <SiteIcon name="document" alt="" className="h-4 w-4" />
                      <span>{post.category}</span>
                    </div>
                    <h3 className="blog-card-title font-serif text-2xl leading-tight text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]">
                      {post.title}
                    </h3>
                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                      {post.excerpt}
                    </p>
                  </Link>
                </article>
              ))
            ) : (
              <div className="university-card rounded-2xl p-6">
                <p className="inline-flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <SiteIcon name="document" alt="" className="h-4 w-4" />
                  No publications yet.
                </p>
                {adminUser ? (
                  <Link
                    href="/blog/admin"
                    className="university-button-secondary mt-4 px-4 py-2 text-sm"
                  >
                    Write the first post
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          <aside className="university-card rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]">
              <SiteIcon name="math" alt="" className="h-4 w-4" />
              Latest problem
            </div>

            {latestProblem ? (
              <Link href={`/problems-with-coffee/${latestProblem.slug}`} prefetch className="group block">
                <h3 className="latest-problem-title font-serif text-2xl leading-tight text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]">
                  {latestProblem.title}
                </h3>
                <p className="latest-problem-summary mt-4 line-clamp-5 text-sm leading-7 text-[var(--color-text-secondary)]">
                  {latestProblem.shortDescription}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[var(--color-text-tertiary)]">
                  {latestProblem.tags[0] ? <span>{latestProblem.tags[0]}</span> : null}
                  {latestProblem.estimatedTime ? <span>{latestProblem.estimatedTime}</span> : null}
                </div>
              </Link>
            ) : (
              <p className="text-sm leading-7 text-[var(--color-text-secondary)]">
                Mathematical problems will appear here when published.
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
