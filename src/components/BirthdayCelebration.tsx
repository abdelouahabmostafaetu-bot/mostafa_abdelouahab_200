
'use client';

import { type CSSProperties, useEffect, useMemo, useState } from 'react';

type BurstParticle = {
  id: string;
  angle: number;
  distance: number;
  size: number;
  hue: number;
  delay: number;
  duration: number;
};

type FireworkBurst = {
  id: string;
  left: number;
  top: number;
  delay: number;
  hue: number;
  particles: BurstParticle[];
};

type FloatingParticle = {
  id: string;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  hue: number;
  drift: number;
  shape: 'spark' | 'confetti';
};

type MathSymbol = {
  id: string;
  symbol: string;
  left: number;
  top: number;
  delay: number;
  size: number;
  hue: number;
};

const BIRTHDAY_MONTH_INDEX = 4;
const BIRTHDAY_DAY = 7;
const AUTO_CLOSE_MS = 11_000;
const MATH_SYMBOLS = ['π', '∫', '∑', '√'];
const FIREWORK_HUES = [38, 192, 220, 278, 322, 352];

function isBirthday(date: Date) {
  return date.getMonth() === BIRTHDAY_MONTH_INDEX && date.getDate() === BIRTHDAY_DAY;
}

function getSeenKey(year: number) {
  return `birthday-celebration-seen-${year}`;
}

function getRandom(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createBurst(
  id: number,
  left: number,
  top: number,
  delay: number,
  particleCount: number,
): FireworkBurst {
  const hue = FIREWORK_HUES[id % FIREWORK_HUES.length];

  return {
    id: `burst-${id}`,
    left,
    top,
    delay,
    hue,
    particles: Array.from({ length: particleCount }, (_, index) => ({
      id: `burst-${id}-particle-${index}`,
      angle: (360 / particleCount) * index + getRandom(-7, 7),
      distance: getRandom(72, 168),
      size: getRandom(3.2, 6.5),
      hue: FIREWORK_HUES[(id + index) % FIREWORK_HUES.length],
      delay: getRandom(0, 0.12),
      duration: getRandom(1050, 1650),
    })),
  };
}

function createFloatingParticles(count: number): FloatingParticle[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `float-${index}`,
    left: getRandom(4, 96),
    top: getRandom(6, 90),
    size: getRandom(4, index % 5 === 0 ? 12 : 8),
    delay: getRandom(0, 3.2),
    duration: getRandom(3600, 7200),
    hue: FIREWORK_HUES[index % FIREWORK_HUES.length],
    drift: getRandom(-34, 34),
    shape: index % 4 === 0 ? 'confetti' : 'spark',
  }));
}

function createMathSymbols(count: number): MathSymbol[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `symbol-${index}`,
    symbol: MATH_SYMBOLS[index % MATH_SYMBOLS.length],
    left: getRandom(7, 90),
    top: getRandom(10, 82),
    delay: getRandom(0, 2.8),
    size: getRandom(2.2, 4.4),
    hue: FIREWORK_HUES[(index + 2) % FIREWORK_HUES.length],
  }));
}

function getBurstPositions(isMobile: boolean) {
  return isMobile
    ? [
        [22, 22],
        [76, 25],
        [50, 14],
        [32, 64],
      ]
    : [
        [18, 24],
        [80, 22],
        [52, 16],
        [27, 70],
        [74, 66],
      ];
}

export default function BirthdayCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [bursts, setBursts] = useState<FireworkBurst[]>([]);
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);
  const [mathSymbols, setMathSymbols] = useState<MathSymbol[]>([]);

  useEffect(() => {
    const now = new Date();
    const params = new URLSearchParams(window.location.search);
    const isPreview =
      process.env.NODE_ENV !== 'production' && params.get('birthdayPreview') === '1';

    if (!isPreview && !isBirthday(now)) {
      return;
    }

    const seenKey = getSeenKey(now.getFullYear());
    try {
      if (window.localStorage.getItem(seenKey)) {
        return;
      }
    } catch {
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducedMotion = motionQuery.matches;
    const isMobile = window.innerWidth < 640;
    const burstParticleCount = reducedMotion ? 8 : isMobile ? 9 : 14;
    const burstPositions = reducedMotion ? [[50, 24]] : getBurstPositions(isMobile);

    setIsReducedMotion(reducedMotion);
    setBursts(
      burstPositions.map(([left, top], index) =>
        createBurst(index, left ?? 50, top ?? 28, index * 0.42, burstParticleCount),
      ),
    );
    setFloatingParticles(createFloatingParticles(reducedMotion ? 12 : isMobile ? 28 : 46));
    setMathSymbols(createMathSymbols(reducedMotion ? 4 : isMobile ? 6 : 9));
    setIsVisible(true);

    try {
      window.localStorage.setItem(seenKey, 'true');
    } catch {
      // Storage may be unavailable in strict privacy modes; the visual can still close safely.
    }

    const closeTimer = window.setTimeout(
      () => setIsVisible(false),
      reducedMotion ? 8_000 : AUTO_CLOSE_MS,
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(closeTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fireworkLayer = useMemo(
    () =>
      bursts.map((burst) => (
        <div
          key={burst.id}
          className="birthday-burst"
          style={
            {
              left: `${burst.left}%`,
              top: `${burst.top}%`,
              '--birthday-delay': `${burst.delay}s`,
              '--birthday-hue': burst.hue,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <span className="birthday-burst-core" />
          {burst.particles.map((particle) => (
            <span
              key={particle.id}
              className="birthday-burst-particle"
              style={
                {
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  '--birthday-angle': `${particle.angle}deg`,
                  '--birthday-distance': `${particle.distance}px`,
                  '--birthday-delay': `${burst.delay + particle.delay}s`,
                  '--birthday-duration': `${particle.duration}ms`,
                  '--birthday-hue': particle.hue,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )),
    [bursts],
  );

  const floatingLayer = useMemo(
    () =>
      floatingParticles.map((particle) => (
        <span
          key={particle.id}
          className={`birthday-floating-particle birthday-floating-particle--${particle.shape}`}
          style={
            {
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              '--birthday-delay': `${particle.delay}s`,
              '--birthday-duration': `${particle.duration}ms`,
              '--birthday-hue': particle.hue,
              '--birthday-drift': `${particle.drift}px`,
            } as CSSProperties
          }
          aria-hidden="true"
        />
      )),
    [floatingParticles],
  );

  const symbolLayer = useMemo(
    () =>
      mathSymbols.map((item) => (
        <span
          key={item.id}
          className="birthday-math-symbol"
          style={
            {
              left: `${item.left}%`,
              top: `${item.top}%`,
              fontSize: `${item.size}rem`,
              '--birthday-delay': `${item.delay}s`,
              '--birthday-hue': item.hue,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          {item.symbol}
        </span>
      )),
    [mathSymbols],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`birthday-celebration ${isReducedMotion ? 'birthday-celebration--reduced' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Birthday celebration"
    >
      <div className="birthday-cinematic-glow" aria-hidden="true" />
      <div className="birthday-symbol-layer" aria-hidden="true">
        {symbolLayer}
      </div>
      <div className="birthday-firework-layer" aria-hidden="true">
        {fireworkLayer}
      </div>
      <div className="birthday-floating-layer" aria-hidden="true">
        {floatingLayer}
      </div>

      <div className="birthday-card">
        <button
          type="button"
          className="birthday-close"
          onClick={() => setIsVisible(false)}
          aria-label="Close birthday celebration"
        >
          ×
        </button>
        <span className="birthday-badge">7 May</span>
        <h2>Happy Birthday, Mostafa 🎉</h2>
        <p>May this year bring more clarity, mathematics, discipline, and beautiful ideas.</p>
        <button
          type="button"
          className="birthday-continue"
          onClick={() => setIsVisible(false)}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
