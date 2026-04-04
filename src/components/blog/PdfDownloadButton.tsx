'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface PdfDownloadProps {
  title?: string;
}

export default function PdfDownloadButton({ title = "Article" }: PdfDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdfFile = await import('html2pdf.js');
      const html2pdf = html2pdfFile.default;

      // Ensure we explicitly grab the article body
      const contentElement = document.querySelector('.prose-academic');
      if (!contentElement) {
        setIsGenerating(false);
        return;
      }

      // Create a temporary unmounted DOM node for styling the actual PDF structure
      const pdfContainer = document.createElement('div');
      pdfContainer.style.padding = '40px 60px';
      pdfContainer.style.fontFamily = "'Latin Modern Roman', 'Computer Modern', 'Georgia', serif";
      pdfContainer.style.color = '#000000'; // Force black text on PDF output 
      pdfContainer.style.backgroundColor = '#ffffff'; // Force white background

      // 1. Render Academic Title
      const titleEl = document.createElement('h1');
      titleEl.innerText = title;
      titleEl.style.textAlign = 'center';
      titleEl.style.fontSize = '24pt';
      titleEl.style.fontWeight = 'bold';
      titleEl.style.marginBottom = '10px';
      titleEl.style.color = '#000000';
      pdfContainer.appendChild(titleEl);

      // 2. Render Author Data
      const authorEl = document.createElement('p');
      authorEl.innerText = 'Abdelouahab Mostafa';
      authorEl.style.textAlign = 'center';
      authorEl.style.fontSize = '14pt';
      authorEl.style.fontStyle = 'italic';
      authorEl.style.marginBottom = '40px';
      authorEl.style.color = '#000000';
      pdfContainer.appendChild(authorEl);

      // 3. Clone existing article body into PDF container
      const contentClone = contentElement.cloneNode(true) as HTMLElement;
      
      // Clean up interactive UI bits we don't want in print (copy buttons)
      contentClone.querySelectorAll('button').forEach((btn) => btn.remove());
      
      // Force all text children to black since dark-mode makes text #e5e7eb
      // This ensures text doesn't end up invisible on white backgrounds
      contentClone.style.color = '#000000';
      const allDescendants = contentClone.querySelectorAll('*');
      for (let i = 0; i < allDescendants.length; i++) {
        const el = allDescendants[i] as HTMLElement;
        el.style.color = '#000000';
        
        // Remove background colors from pre/code so they print cleanly
        if (el.tagName.toLowerCase() === 'pre') {
          el.style.backgroundColor = '#f7f7f7';
          el.style.border = '1px solid #ddd';
        }
      }

      pdfContainer.appendChild(contentClone);

      // 4. Append End Signature
      const signatureEl = document.createElement('p');
      signatureEl.innerText = '— Abdelouahab Mostafa';
      signatureEl.style.textAlign = 'right';
      signatureEl.style.marginTop = '60px';
      signatureEl.style.fontSize = '12pt';
      signatureEl.style.fontStyle = 'italic';
      signatureEl.style.color = '#000000';
      signatureEl.style.borderTop = '1px solid #000000';
      signatureEl.style.paddingTop = '10px';
      signatureEl.style.display = 'inline-block';
      
      const sigWrapper = document.createElement('div');
      sigWrapper.style.display = 'flex';
      sigWrapper.style.justifyContent = 'flex-end';
      sigWrapper.style.width = '100%';
      sigWrapper.style.marginTop = '40px';
      sigWrapper.appendChild(signatureEl);
      
      pdfContainer.appendChild(sigWrapper);

      // Generate the PDF file with the proper settings
      const opt: any = {
        margin: [15, 10, 20, 10], // top, right, bottom, left
        filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Call html2pdf chain to convert cloned body to blob and download directly
      await html2pdf().set(opt).from(pdfContainer).save();

    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-secondary)] transition-colors duration-200 hover:border-[var(--color-text)] hover:text-[var(--color-text)] print:hidden mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Save Article as PDF"
    >
      {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      <span>{isGenerating ? 'Generating...' : 'Save PDF'}</span>
    </button>
  );
}
