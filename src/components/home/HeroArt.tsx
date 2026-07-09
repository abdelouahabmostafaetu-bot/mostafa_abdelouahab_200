'use client';

import dynamic from 'next/dynamic';

// Code-split the SVG art so it stays out of the critical path and loads after
// hydration. It is absolutely positioned behind content, so deferring it never
// causes layout shift.
const HeroMath = dynamic(() => import('@/components/visual/HeroMath'), {
  ssr: false,
  loading: () => null,
});

export default function HeroArt() {
  return <HeroMath />;
}
