'use client';

import dynamic from 'next/dynamic';

const SymbolField = dynamic(() => import('@/components/visual/SymbolField'), {
  ssr: false,
  loading: () => null,
});

/**
 * WhisperSymbols — a very sparse, home-only symbol field for the Publications
 * section header. Lazy, aria-hidden, extremely low opacity so it never touches
 * readability of the content below.
 */
export default function WhisperSymbols() {
  return <SymbolField variant="whisper" />;
}
