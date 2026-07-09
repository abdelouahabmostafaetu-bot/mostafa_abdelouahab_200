'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * MorphGlyph — a single large focal symbol that smoothly crossfades between a
 * sequence of glyphs (α → β → γ → ∫ → Σ) on a slow loop. Two stacked layers
 * crossfade (opacity + slight scale + blur) so there is never a hard cut and
 * never a layout shift (both layers are absolutely centered). A single
 * setInterval drives the index; the crossfade itself is CSS. Under
 * prefers-reduced-motion it renders one static glyph and never cycles.
 * Decorative + aria-hidden.
 */

const SEQUENCE = ['α', 'β', 'γ', '∫', 'Σ'];
const STEP_MS = 2600;

export default function MorphGlyph({ className = '' }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) {
      setReduced(true);
      return;
    }
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % SEQUENCE.length);
    }, STEP_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  // Current + previous glyph for the crossfade.
  const prev = (index - 1 + SEQUENCE.length) % SEQUENCE.length;

  if (reduced) {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none relative grid place-items-center ${className}`.trim()}
      >
        <span
          className="font-serif leading-none text-[var(--accent)]"
          style={{ fontSize: 'clamp(7rem, 22vw, 16rem)', opacity: 0.14 }}
        >
          {SEQUENCE[0]}
        </span>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative grid place-items-center ${className}`.trim()}
    >
      <style>{`
        .mg-layer {
          grid-area: 1 / 1;
          font-family: var(--font-serif), Georgia, serif;
          line-height: 1;
          font-size: clamp(7rem, 22vw, 16rem);
          transition: opacity 1.1s ease, transform 1.1s cubic-bezier(0.22,1,0.36,1), filter 1.1s ease;
          will-change: opacity, transform, filter;
        }
        @media (prefers-reduced-motion: reduce) {
          .mg-layer { transition: none !important; }
        }
      `}</style>

      {/* Outgoing glyph */}
      <span
        className="mg-layer text-[var(--accent-2)]"
        style={{ opacity: 0, transform: 'scale(1.12)', filter: 'blur(6px)' }}
      >
        {SEQUENCE[prev]}
      </span>
      {/* Incoming (current) glyph */}
      <span
        className="mg-layer text-[var(--accent)]"
        style={{ opacity: 0.16, transform: 'scale(1)', filter: 'blur(0)' }}
      >
        {SEQUENCE[index]}
      </span>
    </div>
  );
}
