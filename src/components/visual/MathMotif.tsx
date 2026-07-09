import type { CSSProperties } from 'react';

export type MotifName =
  | 'integral'
  | 'series'
  | 'torus'
  | 'fourier'
  | 'cayley'
  | 'grid';

type MathMotifProps = {
  name: MotifName;
  className?: string;
  style?: CSSProperties;
  /** Base opacity (kept low so it sits quietly behind content). */
  opacity?: number;
};

/**
 * MathMotif — purely decorative mathematical SVGs used as low-opacity margin
 * art. Always aria-hidden and non-interactive; colors come from design tokens
 * (gold currentColor by default). Never place readable text over these at high
 * opacity — they are meant to sit behind content at ~0.08–0.15.
 */
export default function MathMotif({
  name,
  className = '',
  style,
  opacity = 0.12,
}: MathMotifProps) {
  const common = {
    'aria-hidden': true as const,
    focusable: false as const,
    className: `pointer-events-none select-none ${className}`.trim(),
    style: { opacity, color: 'var(--accent)', ...style },
    fill: 'none' as const,
    stroke: 'currentColor',
  };

  switch (name) {
    case 'integral':
      return (
        <svg {...common} viewBox="0 0 120 200" strokeWidth={2}>
          <path
            d="M78 24c0-10-6-14-13-14-9 0-13 7-14 18l-14 140c-1 11-6 18-14 18-7 0-13-4-13-14"
            strokeLinecap="round"
          />
          <line x1="30" y1="100" x2="66" y2="100" strokeLinecap="round" strokeWidth={1.5} />
        </svg>
      );
    case 'series':
      return (
        <svg {...common} viewBox="0 0 240 120" strokeWidth={1.5}>
          <path d="M14 92V28h30c14 0 22 8 22 20s-8 18-22 18H26" strokeLinecap="round" />
          <circle cx="104" cy="60" r="3" fill="currentColor" stroke="none" />
          <circle cx="124" cy="60" r="3" fill="currentColor" stroke="none" />
          <circle cx="144" cy="60" r="3" fill="currentColor" stroke="none" />
          <path d="M186 92V28h30c14 0 22 8 22 20s-8 18-22 18h-18" strokeLinecap="round" />
        </svg>
      );
    case 'torus':
      return (
        <svg {...common} viewBox="0 0 200 140" strokeWidth={1.5}>
          <ellipse cx="100" cy="70" rx="82" ry="46" />
          <ellipse cx="100" cy="70" rx="34" ry="14" />
          <path d="M18 70c14 22 46 36 82 36s68-14 82-36" opacity={0.6} />
        </svg>
      );
    case 'fourier':
      return (
        <svg {...common} viewBox="0 0 260 120" strokeWidth={1.5}>
          <path
            d="M6 60C26 20 46 20 66 60s40 40 60 0 40-40 60 0 40 40 60 0"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'cayley':
      return (
        <svg {...common} viewBox="0 0 160 160" strokeWidth={1.5}>
          <polygon points="80,16 132,54 112,120 48,120 28,54" />
          <circle cx="80" cy="16" r="5" fill="currentColor" stroke="none" />
          <circle cx="132" cy="54" r="5" fill="currentColor" stroke="none" />
          <circle cx="112" cy="120" r="5" fill="currentColor" stroke="none" />
          <circle cx="48" cy="120" r="5" fill="currentColor" stroke="none" />
          <circle cx="28" cy="54" r="5" fill="currentColor" stroke="none" />
          <path d="M80 16 112 120M80 16 48 120M132 54 28 54M132 54 48 120M28 54 112 120" opacity={0.5} />
        </svg>
      );
    case 'grid':
    default:
      return (
        <svg {...common} viewBox="0 0 200 200" strokeWidth={1}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={`h${i}`} x1="0" y1={i * 40} x2="200" y2={i * 40} />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="200" />
          ))}
        </svg>
      );
  }
}
