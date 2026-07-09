import type { CSSProperties } from 'react';

type GenerativeCoverProps = {
  /** Stable seed (e.g. slug/title) — same seed always yields the same art. */
  seed: string;
  /** Short label rendered as a large glyph (e.g. subject initial). */
  label?: string;
  /** Accent color; falls back to the gold token. */
  color?: string;
  className?: string;
  style?: CSSProperties;
};

/** Tiny deterministic string hash → unsigned int. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * GenerativeCover — deterministic SVG cover art for items that have no image.
 * Derives a pattern (grid + curve + glyph) from a seed, tinted with the item's
 * color. Purely decorative; when a `label` is given it is exposed to AT via the
 * wrapping element at the call site. Renders on the server (no client JS).
 */
export default function GenerativeCover({
  seed,
  label,
  color,
  className = '',
  style,
}: GenerativeCoverProps) {
  const h = hash(seed);
  const accent = color || 'var(--accent)';
  const variant = h % 3; // 0 grid, 1 curve, 2 orbits
  const rot = (h % 40) - 20;
  const cx = 40 + (h % 120);
  const cy = 40 + ((h >> 3) % 90);
  const gid = `gc-${h.toString(36)}`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      className={`h-full w-full ${className}`.trim()}
      style={style}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--surface-raised)" />
          <stop offset="100%" stopColor="var(--bg-subtle)" />
        </linearGradient>
      </defs>

      {/* Base panel */}
      <rect width="320" height="180" fill={`url(#${gid})`} />

      {/* Deterministic motif, tinted with the item color */}
      <g stroke={accent} fill="none" strokeWidth={1.25} opacity={0.5}>
        {variant === 0 &&
          [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <line key={i} x1={i * 45} y1="0" x2={i * 45 - 60} y2="180" />
          ))}
        {variant === 1 && (
          <path
            d="M-10 140 C 60 40, 120 40, 180 100 S 300 160, 340 60"
            strokeWidth={1.75}
            transform={`rotate(${rot} 160 90)`}
          />
        )}
        {variant === 2 && (
          <>
            <circle cx={cx} cy={cy} r="46" />
            <circle cx={cx} cy={cy} r="30" opacity={0.7} />
            <circle cx={cx} cy={cy} r="14" opacity={0.5} />
          </>
        )}
      </g>

      {/* Corner glyph */}
      {label ? (
        <text
          x="22"
          y="150"
          fontSize="64"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill={accent}
          opacity={0.9}
        >
          {label.charAt(0).toUpperCase()}
        </text>
      ) : null}
    </svg>
  );
}
