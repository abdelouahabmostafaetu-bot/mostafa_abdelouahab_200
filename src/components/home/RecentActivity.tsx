import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import { getBlogPosts } from '@/lib/content';

export default function RecentActivity() {
  const posts = getBlogPosts().slice(0, 3);

  return (
    <section className="pb-24 pt-8">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-10 flex flex-col gap-4 border-t border-[var(--color-border)] pt-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Latest Writing
            </p>
            <h2
              className="text-3xl font-semibold text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Latest Posts
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Recent articles and notes from the blog.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] transition-colors duration-200 hover:text-[var(--color-accent-light)]"
          >
            View all posts
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {posts.length > 0 ? (
            posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex min-h-[220px] flex-col">
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                    <Calendar size={12} />
                    <span>{post.date}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold leading-snug text-[var(--color-text)] transition-colors duration-200 group-hover:text-[var(--color-accent)]">
                    {post.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                    {post.excerpt}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-6 text-sm font-semibold text-[var(--color-accent)]">
                    <span>{post.category}</span>
                    <span className="inline-flex items-center gap-1">
                      Read
                      <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] py-12 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                No posts yet. Check back soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
