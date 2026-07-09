'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';

// Code-split the SVG art so it stays out of the critical path and loads after
// hydration. It is absolutely positioned behind content, so deferring it never
// causes layout shift.
const HeroMath = dynamic(() => import('@/components/visual/HeroMath'), {
  ssr: false,
  loading: () => null,
});

/**
 * HeroArt — client wrapper that lazy-loads the hero SVG and applies a subtle
 * scroll parallax. A single passive, rAF-throttled scroll listener sets a
 * capped `--hero-parallax` translateY on the wrapper (transform-only, so it
 * stays on the compositor at 60fps with no layout shift). Disabled entirely
 * under prefers-reduced-motion. The art sits behind content (pointer-events
 * none), so the parallax never affects interaction.
 */
export default function HeroArt() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) return;

    let ticking = false;
    const update = () => {
      // Gentle downward drift as the hero scrolls away (capped so it never
      // travels far enough to reveal an edge or cause overflow).
      const offset = Math.min(window.scrollY * 0.18, 120);
      node.style.setProperty('--hero-parallax', `${offset}px`);
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

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        transform: 'translate3d(0, var(--hero-parallax, 0px), 0)',
        willChange: 'transform',
      }}
    >
      <HeroMath />
    </div>
  );
}
