import Link from 'next/link';
import { getBlogPosts } from '@/lib/content';

export default async function RecentActivity() {
  const posts = (await getBlogPosts()).slice(0, 2);

  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-12 flex items-baseline justify-between border-b border-[var(--color-border)] pb-4">
          <h2
            className="text-3xl font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Publications & Notes
          </h2>
        </div>

        <div className="space-y-10">
          {posts.length > 0 ? (
            posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <header className="mb-3">
                    <div className="flex items-center text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-medium mb-3">
                      <span>{post.category}</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                      {post.title}
                    </h3>
                  </header>
                  <p className="text-base text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
                    {post.excerpt}
                  </p>
                </Link>
              </article>
            ))
          ) : (
            <div>
              <p className="text-[var(--color-text-secondary)] italic">No publications yet.</p>
              <Link
                href="/blog/admin"
                className="mt-4 inline-flex rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                Write the first post
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
