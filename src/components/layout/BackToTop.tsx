'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * BackToTop — phone-only floating button (md:hidden) that appears after the
 * user scrolls past a threshold. Uses a single passive, rAF-throttled scroll
 * listener so it never hurts scroll performance. Positioned above the mobile
 * tab bar and the safe-area inset so the two never overlap.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      setVisible(window.scrollY > 600);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`press fixed right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-full)] border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-raised)] transition-[opacity,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none md:hidden ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
      style={{
        bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 12px)',
      }}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
