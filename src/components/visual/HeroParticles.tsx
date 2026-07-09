import type { CSSProperties } from 'react';

/**
 * HeroParticles — a very low-opacity layer of slowly floating mathematical
 * glyphs behind the hero. Pure CSS (scoped <style>), transform/opacity only,
 * so it stays on the compositor. Decorative + aria-hidden. The caller is
 * responsible for only rendering it on desktop and skipping it under
 * prefers-reduced-motion (see HeroArt), but the keyframes are also disabled
 * under reduced-motion here as a belt-and-braces guard.
 */

const GLYPHS: Array<{
  ch: string;
  left: string;
  top: string;
  size: string;
  dur: string;
  delay: string;
  accent2?: boolean;
}> = [
  { ch: '∫', left: '8%', top: '18%', size: '2.6rem', dur: '17s', delay: '0s' },
  { ch: '∑', left: '22%', top: '64%', size: '2rem', dur: '21s', delay: '1.5s', accent2: true },
  { ch: 'π', left: '40%', top: '30%', size: '1.7rem', dur: '19s', delay: '3s' },
  { ch: '∂', left: '62%', top: '72%', size: '2.2rem', dur: '23s', delay: '0.8s' },
  { ch: '∞', left: '78%', top: '24%', size: '2.4rem', dur: '18s', delay: '2.2s', accent2: true },
  { ch: '∇', left: '88%', top: '58%', size: '1.8rem', dur: '20s', delay: '4s' },
  { ch: '∮', left: '52%', top: '12%', size: '1.6rem', dur: '22s', delay: '1s' },
  { ch: 'ℝ', left: '15%', top: '44%', size: '1.6rem', dur: '24s', delay: '3.6s' },
];

export default function HeroParticles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <style>{`
        @keyframes heroParticleFloat {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
          50%  { transform: translate3d(0, -18px, 0) rotate(4deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }
        .hero-particle {
          position: absolute;
          font-family: Georgia, 'Times New Roman', serif;
          line-height: 1;
          opacity: 0.06;
          animation: heroParticleFloat var(--p-dur, 20s) ease-in-out infinite;
          animation-delay: var(--p-delay, 0s);
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-particle { animation: none !important; }
        }
      `}</style>

      {GLYPHS.map((g, i) => (
        <span
          key={i}
          className="hero-particle"
          style={
            {
              left: g.left,
              top: g.top,
              fontSize: g.size,
              color: g.accent2 ? 'var(--accent-2)' : 'var(--accent)',
              '--p-dur': g.dur,
              '--p-delay': g.delay,
            } as CSSProperties
          }
        >
          {g.ch}
        </span>
      ))}
    </div>
  );
}
