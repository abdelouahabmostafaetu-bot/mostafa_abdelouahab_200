'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

// Code-split the SVG art + particle layer so they stay out of the critical
// path and load after hydration. Both are absolutely positioned behind content
// (pointer-events none), so deferring them never causes layout shift.
const HeroMath = dynamic(() => import('@/components/visual/HeroMath'), {
  ssr: false,
  loading: () => null,
});
const HeroParticles = dynamic(
  () => import('@/components/visual/HeroParticles'),
  { ssr: false, loading: () => null },
);

/**
 * HeroArt — client wrapper for the hero SVG. Adds three tasteful, cheap effects,
 * all transform/opacity only and fully gated:
 *   1. Scroll parallax + fade/scale-out as the hero scrolls away (passive rAF).
 *   2. Desktop cursor tilt (pointer:fine only; passive rAF pointermove).
 *   3. A lazy floating-glyph particle layer (desktop + motion allowed only).
 * Everything is disabled under prefers-reduced-motion and on touch devices, so
 * phones get a calm, fast hero. The art sits behind content, so none of this
 * affects interaction or layout.
 */
export default function HeroArt() {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const [enhanced, setEnhanced] = useState(false);

  // Scroll parallax + fade/scale (runs whenever motion is allowed).
  useEffect(() => {
    const node = outerRef.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) return;

    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      // Art drifts slower than content, then gently fades + scales away.
      const offset = Math.min(y * 0.18, 120);
      const fade = Math.max(0, 1 - y / 700);
      const scale = Math.max(0.92, 1 - y / 4000);
      node.style.setProperty('--hero-parallax', `${offset}px`);
      node.style.setProperty('--hero-fade', `${0.35 + 0.65 * fade}`);
      node.style.setProperty('--hero-scale', `${scale}`);
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

  // Desktop cursor tilt + particle enable (pointer:fine, motion allowed).
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (prefersReduced || !finePointer) return;

    setEnhanced(true);

    const tilt = tiltRef.current;
    if (!tilt) return;

    let ticking = false;
    let nx = 0;
    let ny = 0;
    const apply = () => {
      // Small magnetic tilt toward the cursor.
      tilt.style.transform = `perspective(1000px) rotateX(${(-ny * 3).toFixed(2)}deg) rotateY(${(nx * 3).toFixed(2)}deg)`;
      ticking = false;
    };
    const onMove = (e: PointerEvent) => {
      nx = e.clientX / window.innerWidth - 0.5;
      ny = e.clientY / window.innerHeight - 0.5;
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(apply);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div
      ref={outerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        transform:
          'translate3d(0, var(--hero-parallax, 0px), 0) scale(var(--hero-scale, 1))',
        opacity: 'var(--hero-fade, 1)',
        willChange: 'transform, opacity',
      }}
    >
      <div
        ref={tiltRef}
        className="absolute inset-0 transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ willChange: 'transform' }}
      >
        {enhanced ? <HeroParticles /> : null}
        <HeroMath />
      </div>
    </div>
  );
}
