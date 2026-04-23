'use client';

import { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: Heading[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-28 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
        On this page
      </p>
      <ul className="space-y-1 border-l border-[var(--color-border)]">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={`block text-xs py-1 transition-colors duration-150 border-l -ml-px ${
                heading.level === 2 ? 'pl-3' : 'pl-6'
              } ${
                activeId === heading.id
                  ? 'text-[var(--color-accent)] border-[var(--color-accent)] font-medium'
                  : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text)]'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
