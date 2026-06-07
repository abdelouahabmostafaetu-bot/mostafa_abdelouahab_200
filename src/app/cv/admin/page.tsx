import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { getCVData } from '@/lib/cv-data';
import CVAdminClient from '@/components/cv/CVAdminClient';

export const dynamic = 'force-dynamic';

export default async function CVAdminPage() {
  await requireAdmin();
  const cvData = await getCVData();

  return (
    <div className="min-h-screen pb-20 pt-20">
      <div className="mx-auto max-w-xl px-4 md:px-6">

        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/cv"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={13} />
            Back to CV
          </Link>
        </div>

        <header className="mb-8 border-b border-[var(--color-border)] pb-6">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Admin
          </p>
          <h1
            className="text-2xl font-semibold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Edit CV
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Changes are saved to the database and reflected on your public CV instantly.
          </p>
        </header>

        <CVAdminClient initialData={cvData} />

      </div>
    </div>
  );
}
