'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface PdfDownloadProps {
  title?: string;
  coverImageUrl?: string;
}

const AUTHOR_NAME = 'Abdelouahab Mostafa';
const AUTHOR_SUBTITLE = 'Mathematics Notes';

export default function PdfDownloadButton({
  title = 'Article',
  coverImageUrl = '',
}: PdfDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownload = async () => {
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdfModule = await import('html2pdf.js');
      // @ts-ignore - Handle different module resolution between Next/Webpack and standard modules
      const html2pdf = (html2pdfModule as any).default || (html2pdfModule as any);

      if (typeof html2pdf !== 'function') {
        throw new Error('html2pdf.js failed to load.');
      }

      // Grab the original content from the screen directly!
      // This is the clean way. No screen flashes.
      const sourceElement = document.querySelector('.prose-academic') as HTMLElement;
      if (!sourceElement) {
        throw new Error('Could not find article content.');
      }

      const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
      // Higher scale = sharper text in the PDF (but heavier). Keep it moderate for long articles.
      const canvasScale = isSmallScreen ? 1.8 : 2.3;

      // Generate the PDF file with proper settings
      const opt: any = {
        margin: [15, 10, 20, 10], // top, right, bottom, left
        filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,     
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: canvasScale,
          useCORS: true,
          backgroundColor: '#ffffff',
          scrollY: 0,
          onclone: (doc: Document) => {
            // "doc" is the cloned identical document inside html2canvas's invisible iframe.
            // Editing it here applies ONLY to the PDF, without flashing the user's screen!
            try {
              const clone = doc.querySelector('.prose-academic') as HTMLElement;
              if (!clone) return;

              // Inject paper-like CSS rules into the cloned document (PDF-only).
              const styleTag = doc.createElement('style');
              styleTag.textContent = `
                .prose-academic {
                  font-family: Georgia, 'Times New Roman', Times, serif !important;
                  font-size: 12pt !important;
                  line-height: 1.62 !important;
                  color: #1f2933 !important;
                  background: #fff !important;
                }

                .prose-academic p {
                  margin: 0 0 10pt 0 !important;
                  text-align: justify !important;
                }

                .prose-academic h2,
                .prose-academic h3,
                .prose-academic h4 {
                  text-align: left !important;
                  color: #123b40 !important;
                  font-family: inherit !important;
                  page-break-after: avoid !important;
                }

                .prose-academic h2 { font-size: 15pt !important; margin: 18pt 0 8pt 0 !important; }
                .prose-academic h3 { font-size: 13pt !important; margin: 14pt 0 6pt 0 !important; }
                .prose-academic h4 { font-size: 12pt !important; margin: 12pt 0 6pt 0 !important; }

                .prose-academic ul,
                .prose-academic ol {
                  margin: 0 0 10pt 18pt !important;
                }

                .prose-academic li {
                  margin: 0 0 4pt 0 !important;
                  text-align: justify !important;
                }

                .prose-academic a {
                  color: #0f766e !important;
                  text-decoration: underline !important;
                }

                .prose-academic hr {
                  border: none !important;
                  border-top: 1px solid #000 !important;
                  margin: 14pt 0 !important;
                }

                .prose-academic blockquote {
                  border-left: 3px solid #0f766e !important;
                  background: #f4fbfa !important;
                  margin: 12pt 0 !important;
                  padding-left: 12pt !important;
                  font-style: italic;
                }

                .prose-academic code {
                  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
                  font-size: 10.5pt !important;
                  color: #000 !important;
                }

                .prose-academic pre {
                  background: #f7f7f7 !important;
                  border: 1px solid #d0d0d0 !important;
                  border-radius: 8px !important;
                  padding: 12pt !important;
                  page-break-inside: avoid !important;
                }

                .prose-academic table {
                  border-collapse: collapse !important;
                }

                .prose-academic th,
                .prose-academic td {
                  border: 1px solid #000 !important;
                  padding: 6pt 8pt !important;
                }

                .prose-academic img {
                  max-width: 100% !important;
                  height: auto !important;
                  border-radius: 8px !important;
                  page-break-inside: avoid !important;
                }

                .katex { color: #000 !important; }
                .pdf-title-block {
                  border-bottom: 2px solid #0f766e;
                  margin-bottom: 18pt;
                  padding-bottom: 14pt;
                  text-align: center;
                }
                .pdf-title {
                  color: #123b40 !important;
                  font-size: 26pt;
                  font-weight: 700;
                  line-height: 1.12;
                  margin-bottom: 9pt;
                }
                .pdf-author,
                .pdf-date {
                  color: #52615f !important;
                  font-size: 11pt;
                  line-height: 1.35;
                }
                .pdf-cover-image {
                  border: 1px solid #d8e5e3;
                  border-radius: 10px;
                  display: block;
                  margin: 0 auto 18pt;
                  max-height: 280px;
                  max-width: 100%;
                  object-fit: cover;
                }
              `;
              doc.head.appendChild(styleTag);

              // 1. Force PDF layout styles (Overrides CSS rules)
              // A4 width at 96dpi is ~794px. Keeping a stable width prevents layout shifts.
              clone.style.width = '794px';
              clone.style.maxWidth = 'none';
              clone.style.margin = '0 auto';
              clone.style.padding = '54px 72px';
              clone.style.fontFamily = "Georgia, 'Times New Roman', Times, serif";
              clone.style.color = '#1f2933';
              clone.style.backgroundColor = '#ffffff';
              clone.style.textAlign = 'left';

              // 2. Add a clean article title block.
              const titleBlock = doc.createElement('div');
              titleBlock.className = 'pdf-title-block';

              const titleEl = doc.createElement('div');
              titleEl.textContent = title;
              titleEl.className = 'pdf-title';

              const authorEl = doc.createElement('div');
              authorEl.textContent = AUTHOR_NAME;
              authorEl.className = 'pdf-author';

              const subtitleEl = doc.createElement('div');
              subtitleEl.textContent = AUTHOR_SUBTITLE;
              subtitleEl.className = 'pdf-author';

              const dateEl = doc.createElement('div');
              dateEl.textContent = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
              dateEl.className = 'pdf-date';

              titleBlock.appendChild(titleEl);
              titleBlock.appendChild(authorEl);
              titleBlock.appendChild(subtitleEl);
              titleBlock.appendChild(dateEl);
              clone.insertBefore(titleBlock, clone.firstChild);

              if (coverImageUrl) {
                const cover = doc.createElement('img');
                cover.src = coverImageUrl;
                cover.alt = title;
                cover.crossOrigin = 'anonymous';
                cover.className = 'pdf-cover-image';
                titleBlock.insertAdjacentElement('afterend', cover);
              }

              // 4. Force colors & cleanup interactive elements
              clone.querySelectorAll('button').forEach(btn => btn.remove());

              // Neutralize colorful MDX callout boxes (inline-styled divs) to match a paper look.
              const styledNodes = clone.querySelectorAll<HTMLElement>('[style]');
              styledNodes.forEach((el) => {
                const tag = el.tagName.toLowerCase();

                // Remove gradients / tinted panels (paper look)
                if (tag !== 'pre') {
                  el.style.background = 'transparent';
                  el.style.backgroundColor = 'transparent';
                  (el.style as any).backgroundImage = 'none';
                }
                (el.style as any).boxShadow = 'none';

                // Make colored borders subtle and paper-friendly.
                if (el.style.border) el.style.borderColor = '#d8e5e3';
                if (el.style.borderTop) el.style.borderTopColor = '#d8e5e3';
                if (el.style.borderRight) el.style.borderRightColor = '#d8e5e3';
                if (el.style.borderBottom) el.style.borderBottomColor = '#d8e5e3';
                if (el.style.borderLeft) el.style.borderLeftColor = '#0f766e';
              });

              // Ensure all body text is readable in the PDF.
              const allElements = clone.querySelectorAll<HTMLElement>('*');
              allElements.forEach((el) => {
                if (!el.closest('.pdf-title-block')) {
                  el.style.color = '#1f2933';
                }
              });
            } catch {
              // ignore clone errors to prevent complete crash
            }
          },
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Generate a PDF Blob directly from the rendered page using onclone modifications.
      // This is safe, doesn't flash the screen, and avoids empty capture bugs.
      const worker = html2pdf().set(opt).from(sourceElement).toPdf();
      const pdf: any = await worker.get('pdf');
      try {
        const pageCount = typeof pdf?.internal?.getNumberOfPages === 'function'
          ? pdf.internal.getNumberOfPages()
          : 0;
        if (pageCount > 0) {
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          pdf.setFontSize(9);
          pdf.setTextColor(0, 0, 0);

          for (let page = 1; page <= pageCount; page++) {
            pdf.setPage(page);
            pdf.text(`${page} / ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          }
        }
      } catch {
        // Ignore footer errors; PDF content is still valid.
      }

      const pdfBlob: Blob = pdf.output('blob');
      const dlFilename: string = opt.filename;

      const url = URL.createObjectURL(pdfBlob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = dlFilename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        // Fallback: open the PDF in a new tab if download is blocked
        window.open(url, '_blank', 'noopener,noreferrer');
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }

    } catch (error) {
      console.error('Failed to generate PDF:', error);
      const message = error instanceof Error ? error.message : 'Unknown error while generating PDF.';
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-6 print:hidden">
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-secondary)] transition-colors duration-200 hover:border-[var(--color-text)] hover:text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed"
        title="Save Article as PDF"
      >
        {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        <span>{isGenerating ? 'Generating...' : 'Save PDF'}</span>
      </button>

      {errorMessage && (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          PDF error: {errorMessage}
        </p>
      )}
    </div>
  );
}
