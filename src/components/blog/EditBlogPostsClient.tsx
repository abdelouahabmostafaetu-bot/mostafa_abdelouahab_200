'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { BlogPost } from '@/types/blog';
import { formatDate } from '@/lib/utils';

function parsePosts(payload: unknown): BlogPost[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter(Boolean) as BlogPost[];
}

export default function EditBlogPostsClient() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  const loadPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const response = await fetch('/api/blog-posts?admin=1', {
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as
        | BlogPost[]
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && !Array.isArray(payload)
            ? payload.error ?? 'Failed to load posts.'
            : 'Failed to load posts.',
        );
      }

      const nextPosts = parsePosts(payload);
      setPosts(nextPosts);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, []);

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">Edit Blog Posts</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Select a blog post to edit its content and metadata.
          </p>
          <Link
            href="/blog/admin"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to admin dashboard
          </Link>
        </div>

        <div className="mb-6">
          {isLoadingPosts ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Loading posts…</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No posts found.</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-[var(--color-text)]">{post.title}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {post.category} • {formatDate(post.createdAt)} • {post.isPublished ? 'Published' : 'Draft'}
                      </div>
                      {post.excerpt && (
                        <div className="text-xs text-[var(--color-text-tertiary)] mt-1 line-clamp-2">
                          {post.excerpt}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3 sm:mt-0">
                      <Link
                        href={`/blog/admin/edit/${post.id}`}
                        className="rounded-md border border-blue-500/30 px-3 py-1 text-xs text-blue-400 transition hover:bg-blue-500/10"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-[var(--color-accent)]/30 px-3 py-1 text-xs text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/10"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}