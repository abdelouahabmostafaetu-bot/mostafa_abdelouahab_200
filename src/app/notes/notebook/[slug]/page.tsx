import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { connectToDatabase } from '@/lib/mongodb';
import { NotebookModel } from '@/lib/models/notebook';
import { NotebookPageModel } from '@/lib/models/notebook-page';
import { renderMDX } from '@/lib/mdx';
import NotebookBooklet, {
  type BookletPage,
} from '@/components/notebooks/NotebookBooklet';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    await connectToDatabase();
    const nb = await NotebookModel.findOne({ slug, isPublished: true }).lean();
    if (!nb) return { title: 'Notebook Not Found' };
    return {
      title: `${nb.title} | Research Journal`,
      description:
        nb.description ||
        `${nb.title} — a research notebook in ${nb.subject}.`,
    };
  } catch {
    return { title: 'Research Journal' };
  }
}

export default async function NotebookViewerPage({ params }: PageProps) {
  const { slug } = await params;

  let notebook: {
    title: string;
    slug: string;
    subject: string;
    description: string;
    color: string;
  } | null = null;

  let pages: BookletPage[] = [];

  try {
    await connectToDatabase();
    const nb = await NotebookModel.findOne({
      slug,
      isPublished: true,
    }).lean();
    if (!nb) notFound();

    notebook = {
      title: nb.title,
      slug: nb.slug,
      subject: nb.subject,
      description: nb.description,
      color: nb.color,
    };

    const rawPages = await NotebookPageModel.find({ notebookSlug: slug })
      .sort({ pageNumber: 1 })
      .lean();

    pages = await Promise.all(
      rawPages.map(async (p) => ({
        pageNumber: p.pageNumber,
        title: p.title,
        content: await renderMDX(p.content),
      }))
    );
  } catch {
    notFound();
  }

  if (!notebook) notFound();

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        {/* Back link */}
        <Link
          href="/notes"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          All Notebooks
        </Link>

        {/* Booklet */}
        <NotebookBooklet
          title={notebook.title}
          subject={notebook.subject}
          description={notebook.description}
          pages={pages}
        />

        {/* Back link at bottom */}
        <div className="mt-10 text-center">
          <Link
            href="/notes"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={14} />
            Back to all notebooks
          </Link>
        </div>
      </div>
    </div>
  );
}
