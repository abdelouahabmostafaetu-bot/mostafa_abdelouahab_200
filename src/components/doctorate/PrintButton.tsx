'use client';

import { Printer } from 'lucide-react';

/**
 * PrintButton — opens the browser print dialog. Choosing
 * "Save as PDF" downloads the exam + solutions as a PDF file.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      <Printer size={15} aria-hidden="true" />
      Download PDF / Print
    </button>
  );
}
