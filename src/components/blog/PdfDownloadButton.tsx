'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface PdfDownloadProps {
  title?: string;
}

export default function PdfDownloadButton({ title = "Article" }: PdfDownloadProps) {
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
      const canvasScale = isSmallScreen ? 1.5 : 2;

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

              // 1. Force PDF layout styles (Overrides CSS rules)
              clone.style.width = '800px'; 
              clone.style.maxWidth = 'none'; 
              clone.style.margin = '0 auto';
              clone.style.padding = '30px 40px';
              clone.style.fontFamily = "'Latin Modern Roman', 'Computer Modern', 'Georgia', serif";
              clone.style.color = '#000000';
              clone.style.backgroundColor = '#ffffff';

              // 2. Add Title to the top
              const titleEl = doc.createElement('h1');
              titleEl.innerText = title;
              titleEl.style.textAlign = 'center';
              titleEl.style.fontSize = '24pt';
              titleEl.style.fontWeight = 'bold';
              titleEl.style.marginBottom = '10px';
              titleEl.style.color = '#000000';
              clone.insertBefore(titleEl, clone.firstChild);

              // 3. Add Author to the top
              const authorEl = doc.createElement('p');
              authorEl.innerText = 'Abdelouahab Mostafa';
              authorEl.style.textAlign = 'center';
              authorEl.style.fontSize = '14pt';
              authorEl.style.fontStyle = 'italic';
              authorEl.style.marginBottom = '40px';
              authorEl.style.color = '#000000';
              clone.insertBefore(authorEl, clone.children[1]);

              // 4. Force colors & cleanup interactive elements
              clone.querySelectorAll('button').forEach(btn => btn.remove());
              
              const allElements = clone.querySelectorAll('*');
              for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i] as HTMLElement;
                if (el.style) {
                  el.style.color = '#000000'; // Override Dark Mode
                }
                const tag = el.tagName.toLowerCase();
                if (tag === 'pre') {
                  el.style.backgroundColor = '#f7f7f7';
                  el.style.border = '1px solid #ddd';
                }
                const accent = '#00509e';
                if (tag === 'a') {
                  el.style.color = accent;
                  el.style.textDecoration = 'underline';
                  (el.style as any).textDecorationColor = accent;
                }
                if (tag === 'blockquote') {
                  el.style.borderColor = accent;
                }
              }

              // 5. Add Signature at Bottom
              const signatureEl = doc.createElement('p');
              signatureEl.innerText = '\u2014 Abdelouahab Mostafa';
              signatureEl.style.textAlign = 'right';
              signatureEl.style.marginTop = '60px';
              signatureEl.style.fontSize = '12pt';
              signatureEl.style.fontStyle = 'italic';
              signatureEl.style.color = '#000000';
              signatureEl.style.borderTop = '1px solid #000000';
              signatureEl.style.paddingTop = '10px';
              signatureEl.style.display = 'inline-block';
              
              const sigWrapper = doc.createElement('div');
              sigWrapper.style.display = 'flex';
              sigWrapper.style.justifyContent = 'flex-end';
              sigWrapper.style.width = '100%';
              sigWrapper.style.marginTop = '40px';
              sigWrapper.appendChild(signatureEl);
              
              clone.appendChild(sigWrapper);
            } catch {
              // ignore clone errors to prevent complete crash
            }
          },
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Generate a PDF Blob directly from the rendered page using onclone modifications.
      // This is safe, doesn't flash the screen, and avoids empty capture bugs.
      const worker = html2pdf().set(opt).from(sourceElement);
      const pdfBlob: Blob = await worker.outputPdf('blob');
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