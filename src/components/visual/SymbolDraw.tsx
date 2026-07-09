import type { CSSProperties } from 'react';

/**
 * SymbolDraw — a small set of key math glyphs rendered as SVG strokes that
 * "write themselves" via stroke-dashoffset, then gently loop, evoking chalk on
 * a blackboard. Pure SVG + scoped CSS (no client JS). Each path has a staggered
 * delay so they write in sequence. Under prefers-reduced-motion the strokes are
 * shown complete and static. Decorative + aria-hidden; low opacity so it never
 * competes with text.
 *
 * Paths are simplified single-stroke approximations of π, α, Σ, ∫, γ — enough
 * to read as handwriting without being literal typography.
 */

type Stroke = { d: string; len: number; delay: number; teal?: boolean };

const STROKES: Stroke[] = [
  // π
  { d: 'M18 34 H56 M26 34 V60 M48 34 V60', len: 120, delay: 0 },
  // α
  { d: 'M150 40 C120 30 118 66 140 64 C160 62 158 34 150 40 C150 52 160 60 172 62', len: 190, delay: 0.7, teal: true },
  // Σ
  { d: 'M250 30 H214 L236 48 L214 66 H252', len: 150, delay: 1.4 },
  // ∫
  { d: 'M322 22 C332 22 330 30 326 40 L316 78 C312 90 320 96 330 92', len: 150, delay: 2.1 },
  // γ
  { d: 'M368 36 C376 54 384 54 392 36 M384 52 C382 70 378 82 368 88', len: 150, delay: 2.7, teal: true },
];

export default function SymbolDraw({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}
    >
      <style>{`
        @keyframes sdWrite {
          0%   { stroke-dashoffset: var(--sd-len); opacity: 0.15; }
          25%  { opacity: 0.65; }
          60%  { stroke-dashoffset: 0; opacity: 0.6; }
          92%  { stroke-dashoffset: 0; opacity: 0.6; }
          100% { stroke-dashoffset: var(--sd-len); opacity: 0.15; }
        }
        .sd-stroke {
          stroke-dasharray: var(--sd-len);
          stroke-dashoffset: var(--sd-len);
          animation: sdWrite 9s ease-in-out infinite;
          animation-delay: var(--sd-delay, 0s);
          will-change: stroke-dashoffset, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .sd-stroke { animation: none !important; stroke-dashoffset: 0 !important; opacity: 0.5 !important; }
        }
      `}</style>

      <svg
        className="absolute left-1/2 top-[14%] w-[min(92%,440px)] -translate-x-1/2"
        viewBox="0 0 410 110"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        {STROKES.map((s, i) => (
          <path
            key={i}
            className="sd-stroke"
            d={s.d}
            stroke={s.teal ? 'var(--accent-2)' : 'var(--accent)'}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ '--sd-len': s.len, '--sd-delay': `${s.delay}s` } as CSSProperties}
          />
        ))}
      </svg>
    </div>
  );
}
