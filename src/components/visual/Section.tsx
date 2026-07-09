import type { ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
  /** Small uppercase gold kicker above the title. */
  eyebrow?: string;
  /** Oversized editorial index, e.g. "01". */
  index?: string;
  /** Serif section title. */
  title?: ReactNode;
  /** Short supporting text under the title. */
  description?: ReactNode;
  /** Show a hairline gradient rule under the header. */
  divider?: boolean;
  /** Max width of the section shell. */
  width?: 'reading' | 'content' | 'wide';
  className?: string;
  /** Extra content rendered on the right of the header (e.g. an action). */
  action?: ReactNode;
};

const widthClass = {
  reading: 'max-w-reading',
  content: 'max-w-content',
  wide: 'max-w-wide',
} as const;

/**
 * Section — shared editorial section wrapper. Server component (no client JS).
 * Provides the recurring kicker / index / serif-title header used across pages.
 */
export default function Section({
  children,
  eyebrow,
  index,
  title,
  description,
  divider = false,
  width = 'wide',
  className = '',
  action,
}: SectionProps) {
  const hasHeader = eyebrow || index || title || description;

  return (
    <section
      className={`mx-auto ${widthClass[width]} px-4 sm:px-6 ${className}`.trim()}
    >
      {hasHeader && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {index && (
              <span className="section-index mb-2 block" aria-hidden="true">
                {index}
              </span>
            )}
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && (
              <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--text)] sm:text-4xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {divider && <hr className="rule-glow mt-6" />}

      {children}
    </section>
  );
}
