import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { connectToDatabase } from '@/lib/mongodb';
import { NotebookModel } from '@/lib/models/notebook';
import { NotebookPageModel } from '@/lib/models/notebook-page';
import SiteIcon from '@/components/ui/SiteIcon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Notebooks Admin' };

export default async function NotebooksAdminPage() {
  await requireAdmin();

  let notebooks: { id: string; slug: string; title: string; subject: string; color: string; pageCount: number }[] = [];

  try {
    await connectToDatabase();
    const raw = await NotebookModel.find({}).sort({ createdAt: -1 }).lean();
    notebooks = await Promise.all(
      raw.map(async (nb) => ({
        id: String(nb._id),
        slug: nb.slug,
        title: nb.title,
        subject: nb.subject,
        color: nb.color,
        pageCount: await NotebookPageModel.countDocuments({ notebookSlug: nb.slug }),
      })),
    );
  } catch { /* db unavailable */ }

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-3xl px-4 md:px-6">

        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <Link href="/notes" className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors">
            ← Back to Notebooks
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] md:text-3xl" style={{ fontFamily: 'var(--font-serif)' }}>
            Notebooks Admin
          </h1>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {notebooks.length} notebook{notebooks.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="mb-6">
          <Link
            href="/notes/admin/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90"
          >
            <Plus size={14} />
            Create Notebook
          </Link>
        </div>

        {notebooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-14 text-center text-sm text-[var(--color-text-secondary)]">
            No notebooks yet. Create your first one.
          </div>
        ) : (
          <div className="space-y-2">
            {notebooks.map((nb) => (
              <div key={nb.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: nb.color }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-serif)' }}>
                    {nb.title}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">
                    {nb.subject} · {nb.pageCount} page{nb.pageCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <Link
                  href={`/notes/admin/${nb.slug}`}
                  className="shrink-0 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
