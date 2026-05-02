import Link from 'next/link';
import SiteIcon from '@/components/ui/SiteIcon';
import { getCurrentAdminUser } from '@/lib/admin';
import { getBlogPosts } from '@/lib/content';

export default async function RecentActivity() {
  const posts = (await getBlogPosts()).slice(0, 2);
  const adminUser = await getCurrentAdminUser();

  return (
    <section className="py-10 md:py-16">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="mb-7 flex items-baseline justify-between border-b border-[var(--color-border)] pb-3 md:mb-12 md:pb-4">
          <h2
            className="inline-flex items-center gap-2 text-xl font-bold text-[var(--color-text)] md:gap-3 md:text-3xl"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            <SiteIcon name="notebook" alt="" className="h-5 w-5 md:h-7 md:w-7" />
            Publications & Notes
          </h2>
        </div>

        <div className="space-y-7 md:space-y-10">
          {posts.length > 0 ? (
            posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <header className="mb-3">
                    <div className="flex items-center text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-medium mb-3">
                      <SiteIcon name="document" alt="" className="mr-2 h-3.5 w-3.5" />
                      <span>{post.category}</span>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] md:mb-4 md:text-2xl" style={{ fontFamily: 'var(--font-serif)' }}>
                      {post.title}
                    </h3>
                  </header>
                  <p className="line-clamp-2 max-w-3xl text-[13px] leading-5 text-[var(--color-text-secondary)] md:line-clamp-none md:text-base md:leading-relaxed">
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
      </div>
    </section>
  );
}
