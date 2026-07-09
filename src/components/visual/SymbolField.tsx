'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * SymbolField — a decorative, aria-hidden layer of drifting mathematical
 * symbols and Greek letters that sits BEHIND content. Pure CSS + SVG, no libs.
 *
 * This commit ships the CORE only: deterministic parallax drift + a staggered
 * fade/scale entrance (IntersectionObserver). Later commits layer on the
 * handwritten path-draw, a morphing focal glyph, a constellation network, and
 * desktop magnetic interaction.
 *
 * Guardrails baked in:
 *  - aria-hidden, pointer-events none, clipped to its box (no overflow).
 *  - Low opacity, gold with sparing teal, so text on top stays AA-readable.
 *  - `density` scales the symbol count down hard on mobile (fewer = faster).
 *  - All motion is transform/opacity only and lives in the scoped <style>;
 *    under prefers-reduced-motion the drift freezes and symbols just fade in.
 */

export type SymbolFieldVariant = 'hero' | 'whisper';

type SymbolFieldProps = {
  variant?: SymbolFieldVariant;
  className?: string;
};

const GLYPHS = [
  'α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'π', 'φ', 'ψ', 'ω',
  'Σ', 'Π', '∫', '∮', '∞', '∇', '∂', '√', '±', '≈', '⊂', '∈',
];

type Placed = {
  ch: string;
  leftPct: number;
  topPct: number;
  size: number; // rem
  depth: number; // 1 (far) .. 3 (near) — parallax + opacity
  dur: number; // s
  delay: number; // s
  drift: number; // px vertical travel
  rot: number; // deg wobble
  teal: boolean;
};

/** Small deterministic PRNG so SSR and client agree (no hydration mismatch). */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildField(count: number, seed: number): Placed[] {
  const rand = mulberry32(seed);
  const out: Placed[] = [];
  for (let i = 0; i < count; i += 1) {
    const depth = 1 + Math.floor(rand() * 3);
    out.push({
      ch: GLYPHS[Math.floor(rand() * GLYPHS.length)],
      leftPct: Math.round(rand() * 100),
      topPct: Math.round(rand() * 100),
      size: 1.1 + depth * 0.7 + rand() * 0.6,
      depth,
      dur: 16 + rand() * 14,
      delay: rand() * 6,
      drift: 10 + depth * 6,
      rot: (rand() * 2 - 1) * 6,
      teal: rand() < 0.22, // gold dominant, teal sparing
    });
  }
  return out;
}

export default function SymbolField({
  variant = 'hero',
  className = '',
}: SymbolFieldProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [entered, setEntered] = useState(false);

  // Mobile gets far fewer symbols. Whisper variant is sparse everywhere.
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(window.matchMedia('(max-width: 640px)').matches);
  }, []);

  const baseCount =
    variant === 'whisper' ? (mobile ? 4 : 8) : mobile ? 7 : 22;
  const seed = variant === 'whisper' ? 1337 : 4242;
  const field = buildField(baseCount, seed);

  // Entrance: fade/scale/stagger when the layer scrolls into view (or instantly
  // under reduced motion).
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) {
      setEntered(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setEntered(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const layerOpacity = variant === 'whisper' ? 0.05 : 0.1;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}
      style={{ opacity: layerOpacity }}
    >
      <style>{`
        @keyframes sfDrift {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
          50%  { transform: translate3d(0, calc(var(--sf-drift) * -1), 0) rotate(var(--sf-rot)); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }
        .sf-glyph {
          position: absolute;
          font-family: Georgia, 'Times New Roman', serif;
          line-height: 1;
          transform: translate3d(0, 8px, 0) scale(0.9);
          opacity: 0;
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1),
                      transform 0.8s cubic-bezier(0.22,1,0.36,1);
          transition-delay: var(--sf-enter-delay, 0s);
          will-change: transform, opacity;
        }
        .sf-entered .sf-glyph {
          opacity: var(--sf-op, 0.8);
          transform: translate3d(0, 0, 0) scale(1);
        }
        /* Once entered, hand off to the infinite drift (non-reduced only). */
        .sf-entered .sf-glyph.sf-animate {
          animation: sfDrift var(--sf-dur, 20s) ease-in-out infinite;
          animation-delay: var(--sf-delay, 0s);
        }
        @media (prefers-reduced-motion: reduce) {
          .sf-glyph { transition: opacity 0.4s ease !important; transform: none !important; }
          .sf-entered .sf-glyph { transform: none !important; }
          .sf-glyph.sf-animate { animation: none !important; }
        }
      `}</style>

      <div className={entered ? 'sf-entered absolute inset-0' : 'absolute inset-0'}>
        {field.map((g, i) => (
          <span
            key={i}
            className="sf-glyph sf-animate"
            style={
              {
                left: `${g.leftPct}%`,
                top: `${g.topPct}%`,
                fontSize: `${g.size}rem`,
                color: g.teal ? 'var(--accent-2)' : 'var(--accent)',
                // Nearer layers are a touch brighter for depth.
                '--sf-op': 0.35 + g.depth * 0.2,
                '--sf-dur': `${g.dur}s`,
                '--sf-delay': `${g.delay}s`,
                '--sf-drift': `${g.drift}px`,
                '--sf-rot': `${g.rot}deg`,
                '--sf-enter-delay': `${Math.min(i * 0.04, 0.8)}s`,
              } as CSSProperties
            }
          >
            {g.ch}
          </span>
        ))}
      </div>
    </div>
  );
}
