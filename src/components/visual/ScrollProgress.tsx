'use client';

import { useEffect, useRef } from 'react';

/**
 * ScrollProgress — a thin gold bar pinned to the very top that fills as the
 * page scrolls. Uses a single passive, rAF-throttled scroll listener and only
 * animates `transform: scaleX()` (compositor-friendly, 60fps, no layout shift).
 * Under prefers-reduced-motion it still reflects position but without the
 * smoothing transition. Purely decorative — aria-hidden.
 */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      node.style.transform = `scaleX(${ratio})`;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
    >
      <div
        ref={ref}
        className="h-full w-full origin-left bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))] transition-transform duration-150 ease-out motion-reduce:transition-none"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
