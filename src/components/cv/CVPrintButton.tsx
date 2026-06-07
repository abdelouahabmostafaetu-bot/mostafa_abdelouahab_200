'use client';

import { Printer } from 'lucide-react';

/**
 * CVPrintButton — triggers window.print() so the user can save the CV
 * as a PDF using the browser's native print-to-PDF functionality.
 *
 * This must be a client component because it uses a browser API.
 * The page uses `print:hidden` utility classes to hide interactive
 * UI elements (navbar, footer, buttons) when printing.
 */
export default function CVPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      aria-label="Print or save CV as PDF"
    >
      <Printer size={13} aria-hidden="true" />
      Print / Save PDF
    </button>
  );
}
