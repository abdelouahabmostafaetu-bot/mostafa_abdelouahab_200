'use client';

import React from 'react';
import { Download } from 'lucide-react';

export default function PdfDownloadButton() {
  const handleDownload = () => {
    window.print();
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-secondary)] transition-colors duration-200 hover:border-[var(--color-text)] hover:text-[var(--color-text)] print:hidden mt-6"
      title="Save Article as PDF"
    >
      <Download size={12} />
      <span>Save PDF</span>
    </button>
  );
}
