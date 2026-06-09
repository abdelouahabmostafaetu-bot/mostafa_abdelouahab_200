import type { Metadata } from "next";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import { NotebookModel } from "@/lib/models/notebook";
import { NotebookPageModel } from "@/lib/models/notebook-page";
import { getCurrentAdminUser } from "@/lib/admin";
import SiteIcon from "@/components/ui/SiteIcon";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research Journal",
  description:
    "A personal collection of PhD research notebooks — theories, theorems, definitions, and observations in mathematics.",
};

type NotebookWithCount = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  description: string;
  color: string;
  pageCount: number;
};

async function getNotebooks(): Promise<NotebookWithCount[]> {
  try {
    await connectToDatabase();
    const notebooks = await NotebookModel.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .lean();

    return await Promise.all(
      notebooks.map(async (nb) => ({
        id: String(nb._id),
        slug: nb.slug,
        title: nb.title,
        subject: nb.subject,
        description: nb.description,
        color: nb.color,
        pageCount: await NotebookPageModel.countDocuments({
          notebookSlug: nb.slug,
        }),
      })),
    );
  } catch {
    return [];
  }
}

function NotebookCard({ notebook }: { notebook: NotebookWithCount }) {
  return (
    <Link
      href={`/notes/notebook/${notebook.slug}`}
      className="notebook-cover-card group"
    >
      {/* Colored accent strip at top */}
      <div
        style={{
          height: '3px',
          background: `linear-gradient(90deg, transparent 18px, ${notebook.color} 18px, ${notebook.color} 100%)`,
        }}
        aria-hidden="true"
      />

      {/* Cover content */}
      <div className="notebook-cover-content">
        {/* Subject badge */}
        <p className="notebook-cover-subject">
          {notebook.subject}
        </p>

        {/* Title */}
        <h2 className="notebook-cover-title">
          {notebook.title}
        </h2>

        {/* Description */}
        {notebook.description && (
          <p className="notebook-cover-description">
            {notebook.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="notebook-cover-footer">
        <span className="notebook-cover-pages">
          {notebook.pageCount} page{notebook.pageCount !== 1 ? "s" : ""}
        </span>
        <span className="notebook-cover-open">
          Open →
        </span>
      </div>
    </Link>
  );
}

export default async function NotesPage() {
  const [notebooks, adminUser] = await Promise.all([
    getNotebooks(),
    getCurrentAdminUser(),
  ]);

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-6">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              PhD Research Collection
            </p>
            <h1
              className="text-2xl font-semibold text-[var(--color-text)] md:text-4xl"
              style={{ fontFamily: "var(--font-handwritten)" }}
            >
              My Research Journal
            </h1>
            <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]" style={{ fontFamily: "var(--font-handwritten)", fontSize: '14px' }}>
              Theories, theorems &amp; observations — {notebooks.length} notebook{notebooks.length !== 1 ? "s" : ""}
            </p>
          </div>

          {adminUser && (
            <Link
              href="/notes/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <SiteIcon name="settings" alt="" className="h-3.5 w-3.5" />
              Manage
            </Link>
          )}
        </div>

        {/* Grid */}
        {notebooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-16 text-center">
            <SiteIcon
              name="notebook"
              alt=""
              className="mx-auto mb-3 h-8 w-8 opacity-40"
            />
            <p className="text-sm text-[var(--color-text-secondary)]" style={{ fontFamily: "var(--font-handwritten)", fontSize: '16px' }}>
              No notebooks yet. Your research journey begins here.
            </p>
            {adminUser && (
              <Link
                href="/notes/admin/create"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <Plus size={14} />
                Create first notebook
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {notebooks.map((nb) => (
              <NotebookCard key={nb.id} notebook={nb} />
            ))}

            {adminUser && (
              <Link
                href="/notes/admin/create"
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-8 text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                style={{ minHeight: '200px' }}
              >
                <Plus size={22} />
                <span className="text-xs font-medium" style={{ fontFamily: "var(--font-handwritten)", fontSize: '15px' }}>New Notebook</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
