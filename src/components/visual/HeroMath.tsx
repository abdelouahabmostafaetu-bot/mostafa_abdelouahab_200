import type { CSSProperties } from 'react';

type HeroMathProps = {
  className?: string;
  style?: CSSProperties;
};

/**
 * HeroMath — decorative animated hero artwork.
 *
 * Pure SVG + CSS (no client hooks), lazy-loadable via next/dynamic. Layers:
 * a soft token gradient mesh that gently breathes AND slowly shifts, a faint
 * drifting grid, a parametric Lissajous curve that draws on once then a second
 * curve that loops its path-draw and gently "morphs" (scale/rotate wobble), and
 * slowly drifting equation glyphs. All motion lives in the scoped <style> and
 * shared `.drift`/`.draw-path` classes, every animation disabled under
 * prefers-reduced-motion. aria-hidden, clipped to its box (no mobile overflow).
 */
export default function HeroMath({ className = '', style }: HeroMathProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}
      style={style}
    >
      {/* Scoped, self-contained hero motion (unique names, reduced-motion safe) */}
      <style>{`
        @keyframes heroMeshBreathe {
          0%   { transform: scale(1) rotate(0deg) translate3d(0,0,0); opacity: 0.9; }
          100% { transform: scale(1.06) rotate(3deg) translate3d(0,-1.5%,0); opacity: 1; }
        }
        @keyframes heroGlyphDrift {
          0%   { transform: translate3d(0,0,0); }
          100% { transform: translate3d(0,-14px,0); }
        }
        @keyframes heroCurveMorph {
          0%   { transform: scale(1) rotate(0deg); }
          50%  { transform: scale(1.04) rotate(2.5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes heroDrawLoop {
          0%   { stroke-dashoffset: 2400; opacity: 0.15; }
          45%  { opacity: 0.55; }
          100% { stroke-dashoffset: 0; opacity: 0.15; }
        }
        .hero-mesh-breathe {
          animation: heroMeshBreathe 16s ease-in-out infinite alternate;
          transform-origin: 60% 40%;
          will-change: transform, opacity;
        }
        .hero-glyph-drift { animation: heroGlyphDrift 9s ease-in-out infinite alternate; will-change: transform; }
        .hero-curve-morph {
          animation: heroCurveMorph 12s ease-in-out infinite;
          transform-origin: 300px 260px;
          will-change: transform;
        }
        .hero-draw-loop {
          stroke-dasharray: 2400;
          animation: heroDrawLoop 9s ease-in-out infinite;
          will-change: stroke-dashoffset, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-mesh-breathe, .hero-glyph-drift, .hero-curve-morph, .hero-draw-loop {
            animation: none !important;
          }
          .hero-draw-loop { stroke-dashoffset: 0 !important; opacity: 0.3 !important; }
        }
      `}</style>

      {/* Gradient mesh (token-driven), gently breathing + shifting */}
      <div className="hero-mesh-breathe absolute inset-0 bg-hero-mesh" />

      {/* SVG art */}
      <svg
        className="drift absolute right-[-10%] top-1/2 h-[120%] w-[80%] -translate-y-1/2 sm:right-0 sm:w-[62%]"
        viewBox="0 0 600 600"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="hero-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>

        {/* Faint grid */}
        <g stroke="var(--border-strong)" strokeWidth={1} opacity={0.35}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <line key={`h${i}`} x1="0" y1={i * 100} x2="600" y2={i * 100} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="600" />
          ))}
        </g>

        {/* Morphing curve group */}
        <g className="hero-curve-morph">
          {/* Base Lissajous curve, draws on once */}
          <path
            className="draw-path"
            style={{ '--draw-len': 2600 } as CSSProperties}
            d="M300 90 C 470 120 520 300 420 430 C 340 530 200 520 150 400 C 100 280 180 130 300 90 Z"
            stroke="url(#hero-stroke)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Inner curve that loops its path-draw continuously */}
          <path
            className="hero-draw-loop"
            d="M300 160 C 410 180 450 300 390 400 C 330 490 240 480 210 390 C 175 290 220 190 300 160 Z"
            stroke="var(--accent)"
            strokeWidth={1.25}
            strokeLinecap="round"
          />
        </g>

        {/* Nodes */}
        <circle cx="300" cy="90" r="5" fill="var(--accent)" />
        <circle cx="420" cy="430" r="4" fill="var(--accent-2)" />
        <circle cx="150" cy="400" r="4" fill="var(--accent)" opacity={0.7} />

        {/* Quiet equation glyphs, slowly drifting */}
        <text
          className="hero-glyph-drift"
          x="70"
          y="140"
          fontSize="46"
          fontFamily="Georgia, serif"
          fill="var(--accent)"
          opacity={0.28}
        >
          ∫
        </text>
        <text
          className="hero-glyph-drift"
          style={{ animationDelay: '1.2s', animationDuration: '11s' }}
          x="470"
          y="520"
          fontSize="40"
          fontFamily="Georgia, serif"
          fill="var(--accent-2)"
          opacity={0.3}
        >
          ∑
        </text>
      </svg>
    </div>
  );
}
