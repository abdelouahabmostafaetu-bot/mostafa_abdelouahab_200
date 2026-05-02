'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { BlogPost } from '@/types/blog';

function parsePosts(payload: unknown): BlogPost[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter(Boolean) as BlogPost[];
}

export default function RemoveBlogPostsClient() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
      const message = error instanceof Error ? error.message : 'Failed to load posts.';
      setErrorMessage(message);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, []);

  const handleDelete = async (post: BlogPost) => {
    const confirmed = window.confirm(`Delete "${post.title}"?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await fetch(`/api/blog-posts/${post.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete post.');
      }

      setStatusMessage(`Deleted "${post.title}".`);
      await loadPosts();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">Remove Blog Posts</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            View all blog posts and remove ones you no longer want published.
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
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--color-text)]">
                      {post.title}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(post)}
                    disabled={isSubmitting}
                    className="shrink-0 rounded-md border border-red-500/30 px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {statusMessage ? (
          <div className="mt-6 border-l-4 border-emerald-500/60 bg-[var(--color-bg)]/90 px-4 py-3 text-sm text-emerald-300">
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 border-l-4 border-red-500/60 bg-[var(--color-bg)]/90 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}