'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';

type Direction = 'up' | 'left' | 'right' | 'none';

type RevealProps = {
  children: ReactNode;
  /** Delay in ms before the reveal transition starts (for staggering). */
  delay?: number;
  /** Render as a different element (default: div). */
  as?: ElementType;
  className?: string;
  /** Trigger once then stop observing (default: true). */
  once?: boolean;
  /**
   * Optional slide direction. When set, the reveal is driven by inline styles
   * (spring-like ease) instead of the shared `.reveal` class, so callers can
   * mix up/left/right for a directional stagger. Omit for the original
   * behaviour (fully backward compatible).
   */
  direction?: Direction;
  /** Travel distance in px for the directional variant. */
  distance?: number;
};

const SPRING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function hiddenTransform(direction: Direction, distance: number): string {
  switch (direction) {
    case 'left':
      return `translate3d(-${distance}px, 0, 0)`;
    case 'right':
      return `translate3d(${distance}px, 0, 0)`;
    case 'up':
      return `translate3d(0, ${distance}px, 0)`;
    default:
      return 'none';
  }
}

/**
 * Reveal — lightweight scroll-reveal using IntersectionObserver + CSS.
 *
 * Default mode: element uses the shared `.reveal` class (opacity 0, translateY)
 * and gains `.is-visible` on scroll-in. When `direction` is provided it instead
 * uses inline transform/opacity with a spring ease so sections can slide in from
 * alternating sides. Both modes are fully disabled under prefers-reduced-motion
 * (revealed immediately) and cause no layout shift (final box reserved).
 */
export default function Reveal({
  children,
  delay = 0,
  as,
  className = '',
  once = true,
  direction,
  distance = 28,
}: RevealProps) {
  const Tag = (as ?? 'div') as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) {
      setReduced(true);
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

  // Directional mode: drive with inline styles (spring ease).
  const useDirectional = Boolean(direction) && direction !== 'none';

  const directionalStyle: CSSProperties | undefined =
    useDirectional && !reduced
      ? {
          opacity: visible ? 1 : 0,
          transform: visible
            ? 'translate3d(0,0,0)'
            : hiddenTransform(direction as Direction, distance),
          transition: `opacity 0.6s ${SPRING} ${delay}ms, transform 0.6s ${SPRING} ${delay}ms`,
          willChange: 'opacity, transform',
        }
      : undefined;

  if (useDirectional) {
    return (
      <Tag ref={ref} className={className} style={directionalStyle}>
        {children}
      </Tag>
    );
  }

  // Default mode: shared `.reveal` class (unchanged behaviour).
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
