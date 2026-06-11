import type { Metadata } from "next";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import { NotebookModel } from "@/lib/models/notebook";
import { NotebookPageModel } from "@/lib/models/notebook-page";
import { getCurrentAdminUser } from "@/lib/admin";
import SiteIcon from "@/components/ui/SiteIcon";
import { Plus, FileText, ArrowUpRight } from "lucide-react";

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

    const [notebooks, counts] = await Promise.all([
      NotebookModel.find({ isPublished: true }).sort({ createdAt: -1 }).lean(),
      NotebookPageModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$notebookSlug", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(counts.map((c) => [c._id, c.count]));

    return notebooks.map((nb) => ({
      id: String(nb._id),
      slug: nb.slug,
      title: nb.title,
      subject: nb.subject,
      description: nb.description,
      color: nb.color,
      pageCount: countMap.get(nb.slug) ?? 0,
    }));
  } catch {
    return [];
  }
}

function NotebookCard({ notebook }: { notebook: NotebookWithCount }) {
  return (
    <Link
      href={`/notes/notebook/${notebook.slug}`}
      className="group flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-accent)]"
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: notebook.color }}
          aria-hidden="true"
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          {notebook.subject}
        </p>
      </div>

      <h2 className="mt-3 font-serif text-lg leading-snug text-[var(--color-text)] text-balance">
        {notebook.title}
      </h2>

      {notebook.description && (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {notebook.description}
        </p>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3.5 text-xs text-[var(--color-text-tertiary)]">
          <span className="inline-flex items-center gap-1.5">
            <FileText size={12} aria-hidden="true" />
            {notebook.pageCount} page{notebook.pageCount !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-accent)]">
            Read
            <ArrowUpRight size={12} aria-hidden="true" />
          </span>
        </div>
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
    <main className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-8">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Research Journal
            </p>
            <h1 className="font-serif text-3xl text-[var(--color-text)] md:text-4xl text-balance">
              Notebooks
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Theories, theorems, definitions, and observations —{" "}
              {notebooks.length} notebook{notebooks.length !== 1 ? "s" : ""} of
              ongoing research.
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
        </header>

        {/* Grid */}
        {notebooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-16 text-center">
            <SiteIcon
              name="notebook"
              alt=""
              className="mx-auto mb-3 h-8 w-8 opacity-40"
            />
            <p className="text-sm text-[var(--color-text-secondary)]">
              No notebooks published yet.
            </p>
            {adminUser && (
              <Link
                href="/notes/admin/create"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <Plus size={14} aria-hidden="true" />
                Create first notebook
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notebooks.map((nb) => (
              <NotebookCard key={nb.id} notebook={nb} />
            ))}

            {adminUser && (
              <Link
                href="/notes/admin/create"
                className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-8 text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <Plus size={20} aria-hidden="true" />
                <span className="text-xs font-medium">New Notebook</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
