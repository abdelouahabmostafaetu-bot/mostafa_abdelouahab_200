import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'Blog Admin | Abdelouahab Mostafa',
  description: 'Admin interface for writing and managing blog posts.',
};

export default async function BlogAdminPage() {
  await requireAdmin();

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">Blog Admin</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Choose what you want to do with the blog.
          </p>
          <Link
            href="/blog"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to blog
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/blog/admin/add"
            className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-all hover:border-[var(--color-accent)] hover:shadow-lg"
          >
            <div className="mb-4 text-2xl">📝</div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Write New Post</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Create a new blog post with rich text editor, images, and markdown support.
            </p>
          </Link>

          <Link
            href="/blog/admin/remove"
            className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-all hover:border-red-500/50 hover:shadow-lg"
          >
            <div className="mb-4 text-2xl">🗑️</div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Remove Posts</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              View all blog posts and remove ones you no longer want published.
            </p>
          </Link>

          <Link
            href="/blog/admin/edit"
            className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-all hover:border-blue-500/50 hover:shadow-lg"
          >
            <div className="mb-4 text-2xl">✏️</div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Edit Posts</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Edit existing blog posts, update content, images, and metadata.
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
