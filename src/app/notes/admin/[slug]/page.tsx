import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { connectToDatabase } from "@/lib/mongodb";
import { NotebookModel } from "@/lib/models/notebook";
import { NotebookPageModel } from "@/lib/models/notebook-page";
import NotebookAdminActions from "@/components/ui/NotebookAdminActions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase().catch(() => null);
  const nb = await NotebookModel.findOne({ slug })
    .lean()
    .catch(() => null);
  return { title: nb ? `Manage: ${nb.title}` : "Manage Notebook" };
}

export default async function ManageNotebookPage({ params }: PageProps) {
  await requireAdmin();
  const { slug } = await params;

  let notebook: {
    title: string;
    slug: string;
    subject: string;
    color: string;
    description: string;
  } | null = null;
  let pages: { id: string; pageNumber: number; title: string }[] = [];

  try {
    await connectToDatabase();
    const nb = await NotebookModel.findOne({ slug }).lean();
    if (!nb) notFound();
    notebook = {
      title: nb.title,
      slug: nb.slug,
      subject: nb.subject,
      color: nb.color,
      description: nb.description,
    };

    const rawPages = await NotebookPageModel.find({ notebookSlug: slug })
      .sort({ pageNumber: 1 })
      .lean();
    pages = rawPages.map((p) => ({
      id: String(p._id),
      pageNumber: p.pageNumber,
      title: p.title,
    }));
  } catch {
    notFound();
  }

  if (!notebook) notFound();

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <Link
            href="/notes/admin"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            ← All Notebooks
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="h-4 w-1 rounded-full"
                  style={{ backgroundColor: notebook.color }}
                  aria-hidden="true"
                />
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  {notebook.subject}
                </p>
              </div>
              <h1
                className="text-2xl font-semibold text-[var(--color-text)]"
                style={{ fontFamily: "var(--font-handwritten)", fontSize: "28px" }}
              >
                {notebook.title}
              </h1>
              <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                {pages.length} page{pages.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/notes/${slug}`}
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                View
              </Link>
            </div>
          </div>
        </div>

        {/* Add page button */}
        <div className="mb-6">
          <Link
            href={`/notes/admin/${slug}/add`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90"
          >
            <Plus size={14} />
            Add Page
          </Link>
        </div>

        {/* Pages list */}
        {pages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-14 text-center text-sm text-[var(--color-text-secondary)]">
            No pages yet. Add the first page.
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-bg-muted)] text-xs font-semibold text-[var(--color-text-secondary)]">
                  {page.pageNumber}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-[var(--color-text)]">
                  {page.title || `Page ${page.pageNumber}`}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/notes/admin/${slug}/edit/${page.pageNumber}`}
                    className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    Edit
                  </Link>
                  <NotebookAdminActions
                    notebookSlug={slug}
                    pageNumber={page.pageNumber}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Danger zone */}
        <div className="mt-12 rounded-xl border border-red-500/20 bg-red-950/10 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400">
            Danger Zone
          </p>
          <NotebookAdminActions notebookSlug={slug} deleteNotebook />
        </div>
      </div>
    </div>
  );
}
