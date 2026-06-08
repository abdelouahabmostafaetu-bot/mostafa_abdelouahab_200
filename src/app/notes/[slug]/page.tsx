import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { connectToDatabase } from "@/lib/mongodb";
import { NotebookModel, type NotebookDoc } from "@/lib/models/notebook";
import {
  NotebookPageModel,
  type NotebookPageDoc,
} from "@/lib/models/notebook-page";
import { getCurrentAdminUser } from "@/lib/admin";
import { renderMDX } from "@/lib/mdx";
import SiteIcon from "@/components/ui/SiteIcon";
import NotebookDownloadButton from "@/components/ui/NotebookDownloadButton";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    await connectToDatabase();
    const notebook = await NotebookModel.findOne({
      slug,
      isPublished: true,
    }).lean();
    if (!notebook) return { title: "Notebook Not Found" };
    return {
      title: notebook.title,
      description: notebook.description || `${notebook.subject} notebook`,
    };
  } catch {
    return { title: "My Notebooks" };
  }
}

export default async function NotebookViewerPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;

  let notebook: (NotebookDoc & { _id: unknown }) | null = null;
  let pages: (NotebookPageDoc & { _id: unknown })[] = [];

  try {
    await connectToDatabase();
    notebook = await NotebookModel.findOne({ slug, isPublished: true }).lean();
    if (notebook) {
      pages = await NotebookPageModel.find({ notebookSlug: slug })
        .sort({ pageNumber: 1 })
        .lean();
    }
  } catch (err) {
    console.error("Notebook viewer DB error:", err);
  }

  if (!notebook) notFound();

  const adminUser = await getCurrentAdminUser();

  const totalPages = pages.length;
  const currentPageNum = Math.max(
    1,
    Math.min(totalPages || 1, parseInt(pageParam ?? "1", 10) || 1),
  );

  const currentPage =
    pages.find((p) => p.pageNumber === currentPageNum) ?? null;
  const prevPage = pages.find((p) => p.pageNumber < currentPageNum)
    ? pages.filter((p) => p.pageNumber < currentPageNum).at(-1)
    : null;
  const nextPage = pages.find((p) => p.pageNumber > currentPageNum) ?? null;

  const renderedContent = currentPage?.content
    ? await renderMDX(currentPage.content).catch(() => null)
    : null;

  const notebookColor = notebook.color ?? "#194a50";

  function pageUrl(n: number) {
    return `/notes/${slug}?page=${n}`;
  }

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        {/* Top bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/notes"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={13} />
            All Notebooks
          </Link>

          <div className="flex items-center gap-2">
            {adminUser && (
              <Link
                href={`/notes/admin/${slug}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <SiteIcon name="edit" alt="" className="h-3.5 w-3.5" />
                Edit
              </Link>
            )}
            <NotebookDownloadButton notebookTitle={notebook.title} />
          </div>
        </div>

        {/* Notebook header */}
        <header className="mb-8">
          <div
            className="mb-4 h-1 w-16 rounded-full"
            style={{ backgroundColor: notebookColor }}
            aria-hidden="true"
          />
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]">
            {notebook.subject}
          </p>
          <h1
            className="text-2xl font-semibold text-[var(--color-text)] md:text-3xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {notebook.title}
          </h1>
          {notebook.description && (
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
              {notebook.description}
            </p>
          )}
        </header>

        {totalPages === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-16 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              This notebook has no pages yet.
            </p>
            {adminUser && (
              <Link
                href={`/notes/admin/${slug}/add`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <SiteIcon name="add" alt="" className="h-3.5 w-3.5" />
                Add first page
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
            {/* Page list sidebar */}
            <nav aria-label="Notebook pages" className="lg:block">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
                Pages
              </p>
              <ul className="space-y-0.5">
                {pages.map((p) => (
                  <li key={p.pageNumber}>
                    <Link
                      href={pageUrl(p.pageNumber)}
                      className={`block truncate rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                        p.pageNumber === currentPageNum
                          ? "bg-[var(--color-accent)]/10 font-medium text-[var(--color-accent)]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      <span className="mr-1.5 text-[var(--color-text-tertiary)]">
                        {p.pageNumber}.
                      </span>
                      {p.title || `Page ${p.pageNumber}`}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Page content */}
            <div id="notebook-content">
              {/* Page header */}
              <div className="mb-6 flex items-baseline justify-between border-b border-[var(--color-border)] pb-4">
                <div>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">
                    Page {currentPageNum} of {totalPages}
                  </p>
                  {currentPage?.title && (
                    <h2
                      className="mt-0.5 text-xl font-semibold text-[var(--color-text)] md:text-2xl"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {currentPage.title}
                    </h2>
                  )}
                </div>
              </div>

              {/* Page body */}
              {renderedContent ? (
                <div className="prose-academic blog-content">
                  {renderedContent}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)] italic">
                  This page is empty.
                </p>
              )}

              {/* Prev / Next navigation */}
              <div className="mt-10 flex items-center justify-between border-t border-[var(--color-border)] pt-6">
                {prevPage ? (
                  <Link
                    href={pageUrl(prevPage.pageNumber)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    <ArrowLeft size={13} />
                    {prevPage.title || `Page ${prevPage.pageNumber}`}
                  </Link>
                ) : (
                  <div />
                )}

                {nextPage ? (
                  <Link
                    href={pageUrl(nextPage.pageNumber)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    {nextPage.title || `Page ${nextPage.pageNumber}`}
                    <ArrowRight size={13} />
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
