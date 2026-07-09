'use client';

import type { ReactNode } from 'react';

/**
 * App Router template — unlike layout.tsx, this remounts on every navigation,
 * so the fade re-runs per route change. Opacity-only (no transform) to avoid
 * any layout shift, and `.fade-in` is disabled under prefers-reduced-motion in
 * globals.css. Children are still server-rendered and passed through, so no
 * data is refetched on the client.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="fade-in">{children}</div>;
}
