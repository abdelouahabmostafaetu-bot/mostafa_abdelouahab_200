'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { List, X, ArrowUp } from 'lucide-react';

export type ReaderSection = {
  pageNumber: number;
  title: string;
  content: ReactNode;
};

type NotebookReaderProps = {
  title: string;
  subject: string;
  description?: string;
  color?: string;
  sections: ReaderSection[];
  /** Optional extra actions rendered in the header (e.g. download button) */
  actions?: ReactNode;
};

export default function NotebookReader({
  title,
  subject,
  description,
  color,
  sections,
  actions,
}: NotebookReaderProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  // Reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      setProgress(total > 0 ? (scrolled / total) * 100 : 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy for the table of contents
  useEffect(() => {
    const headings = sections.map((s) =>
      document.getElementById(`page-${s.pageNumber}`),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((h) => h && observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  const handleTocClick = useCallback(() => {
    setTocOpen(false);
  }, []);

  const toc = (
    <nav aria-label="Table of contents" className="flex flex-col gap-0.5">
      {sections.map((s) => {
        const id = `page-${s.pageNumber}`;
        const isActive = activeId === id;
        return (
          <a
            key={id}
            href={`#${id}`}
            onClick={handleTocClick}
            className={`flex items-baseline gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] leading-snug transition-colors ${
              isActive
                ? 'bg-[var(--color-hover)] font-medium text-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]'
            }`}
            aria-current={isActive ? 'true' : undefined}
          >
            <span
              className={`shrink-0 font-mono text-[11px] tabular-nums ${
                isActive
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              {String(s.pageNumber).padStart(2, '0')}
            </span>
            <span className="min-w-0">{s.title || `Page ${s.pageNumber}`}</span>
          </a>
        );
      })}
    </nav>
  );

  return (
    <div ref={articleRef}>
      {/* Reading progress bar */}
      <div
        className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent print:hidden"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[var(--color-accent)] transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-[var(--color-border)] pb-8">
        <div className="flex items-center gap-2">
          {color && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          )}
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            {subject}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-serif text-3xl leading-tight text-[var(--color-text)] md:text-4xl text-balance">
            {title}
          </h1>
          {actions && (
            <div className="flex shrink-0 items-center gap-2 print:hidden">
              {actions}
            </div>
          )}
        </div>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)] text-pretty">
            {description}
          </p>
        )}
        <p className="mt-4 text-xs text-[var(--color-text-tertiary)]">
          {sections.length} page{sections.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Mobile TOC toggle */}
      {sections.length > 1 && (
        <div className="sticky top-16 z-40 -mx-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 py-2 backdrop-blur-sm md:-mx-6 md:px-6 lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setTocOpen((o) => !o)}
            className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
            aria-expanded={tocOpen}
            aria-controls="mobile-toc"
          >
            {tocOpen ? (
              <X size={14} aria-hidden="true" />
            ) : (
              <List size={14} aria-hidden="true" />
            )}
            Contents
          </button>
          {tocOpen && (
            <div
              id="mobile-toc"
              className="max-h-72 overflow-y-auto border-t border-[var(--color-border)] pt-2 mt-2 pb-1"
            >
              {toc}
            </div>
          )}
        </div>
      )}

      {/* Body: sidebar + document */}
      <div className="flex gap-10 pt-8 lg:pt-10">
        {/* Desktop sidebar TOC */}
        {sections.length > 1 && (
          <aside className="hidden w-56 shrink-0 lg:block print:hidden">
            <div className="sticky top-24">
              <p className="mb-3 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                Contents
              </p>
              <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">
                {toc}
              </div>
            </div>
          </aside>
        )}

        {/* Document */}
        <div className="min-w-0 flex-1">
          {sections.length === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--color-text-secondary)]">
              This notebook has no pages yet.
            </p>
          ) : (
            sections.map((s, i) => (
              <section
                key={s.pageNumber}
                id={`page-${s.pageNumber}`}
                aria-labelledby={`page-${s.pageNumber}-title`}
                className={`scroll-mt-28 ${i > 0 ? 'mt-12 border-t border-[var(--color-border)] pt-10' : ''}`}
              >
                <div className="mb-5 flex items-baseline gap-3">
                  <span className="font-mono text-xs tabular-nums text-[var(--color-text-tertiary)]">
                    {String(s.pageNumber).padStart(2, '0')}
                  </span>
                  <h2
                    id={`page-${s.pageNumber}-title`}
                    className="font-serif text-xl leading-snug text-[var(--color-text)] md:text-2xl text-balance"
                  >
                    {s.title || `Page ${s.pageNumber}`}
                  </h2>
                </div>
                <div className="notebook-reader-content">{s.content}</div>
              </section>
            ))
          )}

          {/* Back to top */}
          {sections.length > 1 && (
            <div className="mt-14 flex justify-center border-t border-[var(--color-border)] pt-8 print:hidden">
              <button
                type="button"
                onClick={() =>
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <ArrowUp size={13} aria-hidden="true" />
                Back to top
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
