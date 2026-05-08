'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function isInternalNavigableLink(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;

  const url = new URL(anchor.href);
  if (url.origin !== window.location.origin) return false;

  const current = window.location;
  return url.pathname !== current.pathname || url.search !== current.search;
}

export default function NavigationFeedback() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return;

      const anchor = (event.target as Element | null)?.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalNavigableLink(anchor)) return;

      window.clearTimeout(timeoutRef.current ?? undefined);
      setIsNavigating(true);
      timeoutRef.current = window.setTimeout(() => setIsNavigating(false), 8000);
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      window.clearTimeout(timeoutRef.current ?? undefined);
    };
  }, []);

  useEffect(() => {
    window.clearTimeout(timeoutRef.current ?? undefined);
    setIsNavigating(false);
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 right-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-150 ${
        isNavigating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="h-full w-1/2 animate-[navigation-progress_900ms_ease-in-out_infinite] bg-[var(--color-accent)] shadow-[0_0_18px_rgba(243,107,22,0.55)]" />
    </div>
  );
}
