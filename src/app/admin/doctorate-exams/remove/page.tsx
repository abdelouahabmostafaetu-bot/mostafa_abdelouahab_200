import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import DoctorateAdminList from '@/components/doctorate/DoctorateAdminList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Remove Doctorate Problem',
};

export default async function RemoveDoctorateProblemPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <Link
            href="/admin/doctorate-exams"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            ← Back
          </Link>
          <h1 className="font-serif text-2xl font-semibold text-[var(--color-text)]">
            Remove Doctorate Problem
          </h1>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Deleting a problem is permanent and cannot be undone.
          </p>
        </div>

        <DoctorateAdminList mode="remove" />
      </div>
    </div>
  );
}
