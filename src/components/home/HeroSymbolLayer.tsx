'use client';

import dynamic from 'next/dynamic';

// All decorative + aria-hidden, code-split so they stay off the critical path
// and never block first paint. They sit behind the hero text (pointer-events
// none) so deferring them causes no layout shift.
const SymbolField = dynamic(() => import('@/components/visual/SymbolField'), {
  ssr: false,
  loading: () => null,
});
const SymbolDraw = dynamic(() => import('@/components/visual/SymbolDraw'), {
  ssr: false,
  loading: () => null,
});
const MorphGlyph = dynamic(() => import('@/components/visual/MorphGlyph'), {
  ssr: false,
  loading: () => null,
});

/**
 * HeroSymbolLayer — composes the three symbol effects behind the hero:
 *   - SymbolField: drifting Greek/operator glyphs + constellation + magnetic.
 *   - SymbolDraw: blackboard stroke-writing of key symbols near the top.
 *   - MorphGlyph: the focal α→β→γ→∫→Σ centerpiece, parked on the RIGHT on
 *     desktop; under sm it shrinks to a faint ambient element (centered, very
 *     low opacity) so it never crowds the type or causes horizontal scroll.
 * Everything is aria-hidden and clipped to the hero box.
 */
export default function HeroSymbolLayer() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <SymbolField variant="hero" />
      <SymbolDraw />

      {/* Focal morphing glyph: right-side centerpiece on desktop. */}
      <div className="absolute inset-y-0 right-0 hidden w-1/2 items-center justify-center md:flex">
        <MorphGlyph />
      </div>

      {/* Mobile: faint ambient morph, centered and small, behind the text. */}
      <div className="absolute inset-0 flex items-center justify-center opacity-60 md:hidden">
        <div className="scale-75">
          <MorphGlyph />
        </div>
      </div>
    </div>
  );
}
