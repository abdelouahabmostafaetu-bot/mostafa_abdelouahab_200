import React from 'react';
import Link from 'next/link';
import { getBlogPosts } from '@/lib/content';

export default function RecentActivity() {
  const posts = getBlogPosts().slice(0, 5);

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
          <Link
            href="/blog"
            className="text-sm font-semibold uppercase tracking-widest text-[var(--color-accent)] hover:text-[#000]"
          >
            Archive
          </Link>
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
            <p className="text-[var(--color-text-secondary)] italic">No publications yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}