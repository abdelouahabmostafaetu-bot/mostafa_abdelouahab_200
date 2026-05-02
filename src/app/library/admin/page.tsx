import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'Library Admin | Abdelouahab Mostafa',
  description: 'Admin interface for managing books in My Library.',
};

export default async function LibraryAdminPage() {
  await requireAdmin();

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">Library Admin</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Choose what you want to do with the library.
          </p>
          <Link
            href="/library"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to library
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/library/admin/add"
            className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-all hover:border-[var(--color-accent)] hover:shadow-lg"
          >
            <div className="mb-4 text-2xl">📚</div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Add New Book</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Add a new book to the library with title, author, description, cover image, and file.
            </p>
          </Link>

          <Link
            href="/library/admin/remove"
            className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-all hover:border-red-500/50 hover:shadow-lg"
          >
            <div className="mb-4 text-2xl">🗑️</div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Remove Books</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              View all books and remove ones you no longer want in the library.
            </p>
          </Link>

          <Link
            href="/library/admin/edit"
            className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-all hover:border-blue-500/50 hover:shadow-lg"
          >
            <div className="mb-4 text-2xl">✏️</div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Edit Books</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Edit book information like title, author, description, and cover image.
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
