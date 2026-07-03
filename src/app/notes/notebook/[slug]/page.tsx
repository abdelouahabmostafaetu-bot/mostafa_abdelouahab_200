import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { connectToDatabase } from '@/lib/mongodb';
import { NotebookModel } from '@/lib/models/notebook';
import { NotebookPageModel } from '@/lib/models/notebook-page';
import { renderMDX } from '@/lib/mdx';
import NotebookReader, {
  type ReaderSection,
} from '@/components/notebooks/NotebookReader';
import NotebookDownloadButton from '@/components/notebooks/NotebookDownloadButton';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

// Force every $$ ... $$ display formula onto its own line, centered on the
// page. Display math is wrapped by rehypeWrapDisplayMath as:
//   .math-scroll > .math-scroll__inner > .katex-display
// so we center the flex wrapper and force ltr (Arabic/RTL text was pushing
// the equation to the side). Inline $ ... $ math is left untouched so it
// stays on the same line as the surrounding text.
const NOTEBOOK_MATH_CSS = [
  '.notebook-reader-content .math-scroll {',
  '  width: 100%;',
  '  text-align: center !important;',
  '  direction: ltr;',
  '}',
  '.notebook-reader-content .math-scroll__inner {',
  '  display: flex !important;',
  '  justify-content: center !important;',
  '  min-width: 100%;',
  '}',
  '.notebook-reader-content .katex-display {',
  '  display: block;',
  '  width: 100%;',
  '  margin-left: auto !important;',
  '  margin-right: auto !important;',
  '  text-align: center !important;',
  '  direction: ltr;',
  '}',
  '.notebook-reader-content .katex-display > .katex {',
  '  display: inline-block;',
  '  text-align: initial;',
  '}',
].join('\n');

const notebookMathStyleProps = { __html: NOTEBOOK_MATH_CSS };

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

  let sections: ReaderSection[] = [];

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

    sections = await Promise.all(
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
    <main className="min-h-screen pt-20 pb-20">
      <style dangerouslySetInnerHTML={notebookMathStyleProps} />
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        {/* Back link */}
        <Link
          href="/notes"
          className="mb-8 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)] print:hidden"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          All Notebooks
        </Link>

        <NotebookReader
          title={notebook.title}
          subject={notebook.subject}
          description={notebook.description}
          color={notebook.color}
          sections={sections}
          actions={
            <NotebookDownloadButton
              notebookTitle={notebook.title}
              notebookSlug={notebook.slug}
              notebookSubject={notebook.subject}
              notebookDescription={notebook.description}
            />
          }
        />
      </div>
    </main>
  );
}
