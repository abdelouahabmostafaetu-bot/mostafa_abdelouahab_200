import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'Problems with Coffee Admin | Abdelouahab Mostafa',
};

export default async function CoffeeProblemsAdminPage() {
  await requireAdmin();

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">
            Problems with Coffee Admin
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Choose what you want to do with your mathematical problems.
          </p>
          <Link
            href="/problems-with-coffee"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to Problems with Coffee
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/admin/problems-with-coffee/add"
            className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-all hover:border-[var(--color-accent)] hover:shadow-lg"
          >
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-accent)]/30 text-sm font-semibold text-[var(--color-accent)]">
              +
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
              Add Problem
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Create a new problem with statement, hints, solution, lesson, and images.
            </p>
          </Link>

          <Link
            href="/admin/problems-with-coffee/remove"
            className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-all hover:border-red-500/50 hover:shadow-lg"
          >
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-red-500/30 text-sm font-semibold text-red-300">
              -
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
              Remove Problem
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              View all problems and delete drafts or published problems safely.
            </p>
          </Link>

          <Link
            href="/admin/problems-with-coffee/edit"
            className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-all hover:border-blue-500/50 hover:shadow-lg"
          >
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-blue-500/30 text-sm font-semibold text-blue-300">
              E
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
              Edit Problem
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Select a problem, update its content, and publish or unpublish it.
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
