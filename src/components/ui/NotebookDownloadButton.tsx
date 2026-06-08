"use client";

import { Printer } from "lucide-react";

export default function NotebookDownloadButton({
  notebookTitle,
}: {
  notebookTitle: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      aria-label={`Print or download ${notebookTitle}`}
      title="Print / Save as PDF"
    >
      <Printer size={13} aria-hidden="true" />
      Download
    </button>
  );
}
