'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MDXContent from '@/components/MDXContent';

export type BookletPage = {
  pageNumber: number;
  title: string;
  content: string;
};

type NotebookBookletProps = {
  title: string;
  subject: string;
  description?: string;
  pages: BookletPage[];
};

export default function NotebookBooklet({
  title,
  subject,
  description,
  pages,
}: NotebookBookletProps) {
  const [currentPage, setCurrentPage] = useState(0); // 0 = cover page
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isAnimating, setIsAnimating] = useState(false);

  const totalPages = pages.length + 1; // +1 for cover

  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 0 || targetPage >= totalPages || isAnimating) return;
      setDirection(targetPage > currentPage ? 'right' : 'left');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentPage(targetPage);
        setIsAnimating(false);
      }, 150);
    },
    [currentPage, totalPages, isAnimating],
  );

  const goNext = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const goPrev = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  const animStyle: React.CSSProperties = isAnimating
    ? {
        opacity: 0,
        transform:
          direction === 'right'
            ? 'translateX(-30px)'
            : 'translateX(30px)',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
      }
    : {
        opacity: 1,
        transform: 'translateX(0)',
        transition: 'opacity 0.3s ease, transform 0.35s ease',
      };

  const isCover = currentPage === 0;
  const pageData = !isCover ? pages[currentPage - 1] : null;

  return (
    <div className="notebook-booklet notebook-paper">
      {/* Page Content */}
      <div
        className="notebook-booklet-page notebook-ruled-lines"
        style={animStyle}
      >
        {isCover ? (
          /* ── Cover Page ── */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '380px',
              textAlign: 'center',
              padding: '40px 20px',
            }}
          >
            {/* Decorative top flourish */}
            <div
              style={{
                fontSize: '24px',
                color: 'var(--leather-gold)',
                marginBottom: '20px',
                opacity: 0.5,
                letterSpacing: '8px',
              }}
            >
              ✦ ✦ ✦
            </div>

            {/* Subject */}
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'var(--ink-faded)',
                marginBottom: '12px',
              }}
            >
              {subject}
            </p>

            {/* Title */}
            <h1
              style={{
                fontFamily: 'var(--font-handwritten)',
                fontSize: 'clamp(28px, 5vw, 38px)',
                fontWeight: 700,
                color: 'var(--ink-dark)',
                lineHeight: 1.2,
                margin: '0 0 12px',
              }}
            >
              {title}
            </h1>

            {/* Description */}
            {description && (
              <p
                style={{
                  fontFamily: 'var(--font-handwritten)',
                  fontSize: '17px',
                  color: 'var(--ink-light)',
                  lineHeight: 1.5,
                  maxWidth: '360px',
                  margin: '0 auto',
                }}
              >
                {description}
              </p>
            )}

            {/* Decorative line */}
            <div
              style={{
                width: '80px',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, var(--parchment-edge), transparent)',
                margin: '24px auto 16px',
              }}
            />

            {/* Page count */}
            <p
              style={{
                fontFamily: 'var(--font-handwritten)',
                fontSize: '14px',
                color: 'var(--ink-faded)',
              }}
            >
              {pages.length} page{pages.length !== 1 ? 's' : ''}
            </p>

            {/* Bottom flourish */}
            <div
              style={{
                fontSize: '16px',
                color: 'var(--leather-gold)',
                marginTop: '24px',
                opacity: 0.4,
              }}
            >
              ❦
            </div>
          </div>
        ) : pageData ? (
          /* ── Content Page ── */
          <div>
            {pageData.title && (
              <h2 className="notebook-page-title">{pageData.title}</h2>
            )}
            <div className="notebook-content">
              <MDXContent content={pageData.content} />
            </div>
          </div>
        ) : null}
      </div>

      {/* Navigation Bar */}
      <div className="notebook-nav">
        <button
          type="button"
          className="notebook-arrow"
          onClick={goPrev}
          disabled={currentPage === 0}
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="notebook-page-indicator">
          {isCover
            ? 'Cover'
            : `Page ${currentPage} of ${pages.length}`}
        </span>

        <button
          type="button"
          className="notebook-arrow"
          onClick={goNext}
          disabled={currentPage >= totalPages - 1}
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
