import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import DoctorateProblemForm from '@/components/doctorate/DoctorateProblemForm';
import DoctorateAdminList from '@/components/doctorate/DoctorateAdminList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit Doctorate Problem',
};

export default async function EditDoctorateProblemPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  await requireAdmin();
  const { slug } = await searchParams;

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
            Edit Doctorate Problem
          </h1>
          {!slug && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              Select the problem you want to edit.
            </p>
          )}
        </div>

        {slug ? (
          <DoctorateProblemForm editSlug={slug} />
        ) : (
          <DoctorateAdminList mode="edit" />
        )}
      </div>
    </div>
  );
}
