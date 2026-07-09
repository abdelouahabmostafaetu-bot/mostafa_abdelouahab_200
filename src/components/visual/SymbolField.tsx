'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

/**
 * SymbolField — a decorative, aria-hidden layer of drifting mathematical
 * symbols and Greek letters that sits BEHIND content. Pure CSS + SVG, no libs.
 *
 * Effects: deterministic parallax drift, staggered fade/scale entrance, a faint
 * constellation network of lines between nearby glyphs (desktop only), and a
 * subtle magnetic pull toward the cursor (desktop only).
 *
 * Guardrails:
 *  - aria-hidden, pointer-events none, clipped to its box (no overflow).
 *  - Low opacity, gold with sparing teal, so text on top stays AA-readable.
 *  - `density` scales the symbol count down hard on mobile (fewer = faster).
 *  - Constellation + magnetic are OFF on mobile / touch / reduced-motion.
 *  - All motion is transform/opacity only; drift lives in the scoped <style>;
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
  depth: number; // 1 (far) .. 3 (near)
  dur: number; // s
  delay: number; // s
  drift: number; // px
  rot: number; // deg
  teal: boolean;
};

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
      teal: rand() < 0.22,
    });
  }
  return out;
}

/** Precompute constellation edges: connect glyphs within a distance threshold. */
function buildEdges(field: Placed[], maxDist: number) {
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number; delay: number }> = [];
  for (let i = 0; i < field.length; i += 1) {
    for (let j = i + 1; j < field.length; j += 1) {
      const dx = field[i].leftPct - field[j].leftPct;
      const dy = field[i].topPct - field[j].topPct;
      const dist = Math.hypot(dx, dy);
      if (dist <= maxDist) {
        edges.push({
          x1: field[i].leftPct,
          y1: field[i].topPct,
          x2: field[j].leftPct,
          y2: field[j].topPct,
          delay: (i % 5) * 0.6,
        });
      }
    }
  }
  return edges;
}

export default function SymbolField({
  variant = 'hero',
  className = '',
}: SymbolFieldProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const glyphRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [entered, setEntered] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setMobile(window.matchMedia('(max-width: 640px)').matches);
  }, []);

  const baseCount =
    variant === 'whisper' ? (mobile ? 4 : 8) : mobile ? 7 : 22;
  const seed = variant === 'whisper' ? 1337 : 4242;

  const field = useMemo(() => buildField(baseCount, seed), [baseCount, seed]);
  const edges = useMemo(
    () => (mobile || variant === 'whisper' ? [] : buildEdges(field, 26)),
    [field, mobile, variant],
  );

  // Entrance.
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

  // Magnetic cursor pull (desktop + pointer:fine + motion allowed only).
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (prefersReduced || !finePointer || isMobile) return;

    setDesktop(true);
    const node = ref.current;
    if (!node) return;

    let ticking = false;
    let px = 0;
    let py = 0;
    const apply = () => {
      const rect = node.getBoundingClientRect();
      const cx = px - rect.left;
      const cy = py - rect.top;
      glyphRefs.current.forEach((el, i) => {
        if (!el) return;
        const gx = (field[i].leftPct / 100) * rect.width;
        const gy = (field[i].topPct / 100) * rect.height;
        const dx = cx - gx;
        const dy = cy - gy;
        const dist = Math.hypot(dx, dy);
        const radius = 180;
        if (dist < radius) {
          // Gentle pull toward cursor, scaled by depth (nearer = more).
          const force = ((radius - dist) / radius) * (2 + field[i].depth * 2);
          const nx = (dx / (dist || 1)) * force;
          const ny = (dy / (dist || 1)) * force;
          el.style.setProperty('--sf-mx', `${nx}px`);
          el.style.setProperty('--sf-my', `${ny}px`);
        } else {
          el.style.setProperty('--sf-mx', '0px');
          el.style.setProperty('--sf-my', '0px');
        }
      });
      ticking = false;
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(apply);
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [field]);

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
          0%   { transform: translate3d(var(--sf-mx,0), 0, 0) rotate(0deg); }
          50%  { transform: translate3d(var(--sf-mx,0), calc(var(--sf-drift) * -1), 0) rotate(var(--sf-rot)); }
          100% { transform: translate3d(var(--sf-mx,0), 0, 0) rotate(0deg); }
        }
        @keyframes sfEdgeShimmer {
          0%, 100% { opacity: 0.05; }
          50%      { opacity: 0.22; }
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
          transform: translate3d(var(--sf-mx,0), 0, 0) scale(1);
        }
        .sf-entered .sf-glyph.sf-animate {
          animation: sfDrift var(--sf-dur, 20s) ease-in-out infinite;
          animation-delay: var(--sf-delay, 0s);
        }
        .sf-edge {
          stroke: var(--accent);
          stroke-width: 0.15;
          animation: sfEdgeShimmer 6s ease-in-out infinite;
          will-change: opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .sf-glyph { transition: opacity 0.4s ease !important; transform: none !important; }
          .sf-entered .sf-glyph { transform: none !important; }
          .sf-glyph.sf-animate { animation: none !important; }
          .sf-edge { animation: none !important; opacity: 0.12 !important; }
        }
      `}</style>

      {/* Constellation network (desktop only). viewBox is a 0..100 percentage
          grid so line coords match glyph left/top percentages. */}
      {desktop && edges.length > 0 && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {edges.map((e, i) => (
            <line
              key={i}
              className="sf-edge"
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              style={{ animationDelay: `${e.delay}s` }}
            />
          ))}
        </svg>
      )}

      <div className={entered ? 'sf-entered absolute inset-0' : 'absolute inset-0'}>
        {field.map((g, i) => (
          <span
            key={i}
            ref={(el) => {
              glyphRefs.current[i] = el;
            }}
            className="sf-glyph sf-animate"
            style={
              {
                left: `${g.leftPct}%`,
                top: `${g.topPct}%`,
                fontSize: `${g.size}rem`,
                color: g.teal ? 'var(--accent-2)' : 'var(--accent)',
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
