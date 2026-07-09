'use client';

import { useEffect, useRef, useState } from 'react';

type CountUpProps = {
  /** Final value to count up to. */
  value: number;
  /** Duration in ms. */
  duration?: number;
  className?: string;
  /** Optional suffix/prefix rendered inline (not animated). */
  suffix?: string;
  prefix?: string;
};

/**
 * CountUp — animates from 0 to `value` once, when it first scrolls into view.
 * Uses IntersectionObserver + a single rAF loop (no interval). Respects
 * prefers-reduced-motion by rendering the final value immediately. The element
 * reserves its final width via tabular-nums, so there is no layout shift.
 */
export default function CountUp({
  value,
  duration = 1100,
  className = '',
  suffix = '',
  prefix = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced || value <= 0) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    let started = false;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(eased * value));
        if (t < 1) raf = window.requestAnimationFrame(tick);
      };
      raf = window.requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            started = true;
            run();
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`.trim()}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
