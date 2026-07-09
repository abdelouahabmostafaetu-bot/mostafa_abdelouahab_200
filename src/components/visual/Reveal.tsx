'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  /** Delay in ms before the reveal transition starts (for staggering). */
  delay?: number;
  /** Render as a different element (default: div). */
  as?: ElementType;
  className?: string;
  /** Trigger once then stop observing (default: true). */
  once?: boolean;
};

/**
 * Reveal — lightweight scroll-reveal using IntersectionObserver + CSS.
 *
 * The element starts with the `.reveal` class (opacity 0, translateY) and gains
 * `.is-visible` when it scrolls into view. All motion is defined in globals.css
 * and fully disabled under prefers-reduced-motion, so there is no JS animation
 * loop and no layout shift (the element occupies its final box from the start).
 */
export default function Reveal({
  children,
  delay = 0,
  as,
  className = '',
  once = true,
}: RevealProps) {
  const Tag = (as ?? 'div') as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // If reduced motion is requested, reveal immediately and skip observing.
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
