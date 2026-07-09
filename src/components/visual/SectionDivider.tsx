'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * SectionDivider — a thin gold gradient hairline that "draws" across from the
 * left when it scrolls into view (IntersectionObserver toggles a scaleX from 0
 * to 1). Transform/opacity only, so it stays on the compositor with no layout
 * shift. Under prefers-reduced-motion it simply renders the full rule. Purely
 * decorative — aria-hidden.
 */
export default function SectionDivider({
  className = '',
}: {
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) {
      setReduced(true);
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`h-px w-full origin-left bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] ${className}`.trim()}
      style={{
        transform: visible ? 'scaleX(1)' : 'scaleX(0)',
        opacity: visible ? 0.6 : 0,
        transition: reduced
          ? 'none'
          : 'transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.9s ease',
        willChange: 'transform, opacity',
      }}
    />
  );
}
