import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import SiteIcon from '@/components/ui/SiteIcon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Doctorate Exams Admin',
};

export default async function AdminDoctorateExamsPage() {
  await requireAdmin();

  let published = 0;
  let drafts = 0;
  try {
    await connectToDatabase();
    [published, drafts] = await Promise.all([
      DoctorateProblem.countDocuments({ published: true }),
      DoctorateProblem.countDocuments({ published: false }),
    ]);
  } catch {
    /* db not available */
  }

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <Link
            href="/doctorate-exams"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            ← Back to Exam Archive
          </Link>
          <h1 className="font-serif text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
            Manage Doctorate Problems
          </h1>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {published} published problem{published !== 1 ? 's' : ''}
            {drafts > 0 ? ` • ${drafts} draft${drafts !== 1 ? 's' : ''}` : ''}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/admin/doctorate-exams/add"
            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-accent)]/50"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/10">
              <SiteIcon name="add" alt="" className="h-5 w-5" />
            </div>
            <p className="font-semibold text-[var(--color-text)]">
              Add Problem
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Add a past exam problem with its source and full solution
            </p>
          </Link>

          <Link
            href="/admin/doctorate-exams/edit"
            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-accent)]/50"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/10">
              <SiteIcon name="edit" alt="" className="h-5 w-5" />
            </div>
            <p className="font-semibold text-[var(--color-text)]">
              Edit Problem
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Update the statement, solution, source, or metadata
            </p>
          </Link>

          <Link
            href="/admin/doctorate-exams/remove"
            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-red-500/30"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
              <SiteIcon name="delete" alt="" className="h-5 w-5" />
            </div>
            <p className="font-semibold text-[var(--color-text)]">
              Remove Problem
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Permanently delete a problem from the archive
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
