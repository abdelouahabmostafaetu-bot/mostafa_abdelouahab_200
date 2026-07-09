import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  MapPin,
  ArrowRight,
  FileText,
} from 'lucide-react';
import HeroArt from '@/components/home/HeroArt';

const profileFacts = [
  { label: 'Institution', value: 'University of Mila', Icon: GraduationCap },
  { label: 'Department', value: 'Fundamental Mathematics', Icon: BookOpen },
  { label: 'Location', value: 'Mila, Algeria', Icon: MapPin },
] as const;

const NAME_WORDS = ['Abdelouahab', 'Mostafa'];

export default function ProfileSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Scoped hero entrance motion (reduced-motion safe) */}
      <style>{`
        @keyframes heroFocusIn {
          0%   { opacity: 0; filter: blur(8px); transform: translate3d(0, 18px, 0); }
          100% { opacity: 1; filter: blur(0);   transform: translate3d(0, 0, 0); }
        }
        @keyframes heroWordIn {
          0%   { opacity: 0; filter: blur(10px); transform: translate3d(0, 22px, 0); }
          100% { opacity: 1; filter: blur(0);    transform: translate3d(0, 0, 0); }
        }
        @keyframes heroCtaPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0.0); }
          50%      { box-shadow: 0 0 22px 2px rgba(var(--accent-rgb), 0.28); }
        }
        @keyframes heroValueShimmer {
          0%   { background-position: 120% 0; }
          100% { background-position: -20% 0; }
        }
        .hero-focus { opacity: 0; animation: heroFocusIn 0.75s cubic-bezier(0.22,1,0.36,1) forwards; will-change: opacity, filter, transform; }
        .hero-word { display: inline-block; opacity: 0; animation: heroWordIn 0.7s cubic-bezier(0.22,1,0.36,1) forwards; will-change: opacity, filter, transform; }
        .hero-cta-pulse { animation: heroCtaPulse 3.2s ease-in-out infinite; animation-delay: 1.2s; }
        .hero-value-shimmer {
          background-image: linear-gradient(100deg, var(--text) 30%, var(--accent-strong) 50%, var(--text) 70%);
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          animation: heroValueShimmer 1.4s ease-out 0.6s 1 both;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-focus, .hero-word { animation: none !important; opacity: 1 !important; filter: none !important; transform: none !important; }
          .hero-cta-pulse { animation: none !important; }
          .hero-value-shimmer { animation: none !important; -webkit-background-clip: initial; background-clip: initial; background-image: none; }
        }
      `}</style>

      {/* Animated math art + gradient mesh (lazy, behind content) */}
      <HeroArt />

      <div className="relative z-10 mx-auto max-w-wide px-4 pb-16 pt-16 sm:px-6 md:pb-24 md:pt-24">
        {/* Eyebrow */}
        <p className="eyebrow hero-focus" style={{ animationDelay: '0.05s' }}>
          Mathematics Researcher
        </p>

        {/* Name — per-word reveal */}
        <h1 className="display-title mt-4 max-w-3xl text-[var(--text)]">
          {NAME_WORDS.map((word, i) => (
            <span
              key={word}
              className="hero-word"
              style={{ animationDelay: `${0.15 + i * 0.12}s`, marginRight: i < NAME_WORDS.length - 1 ? '0.25em' : undefined }}
            >
              {word}
            </span>
          ))}
        </h1>

        {/* Lede */}
        <p
          className="hero-focus mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-muted)]"
          style={{ animationDelay: '0.4s' }}
        >
          Master&rsquo;s student in fundamental mathematics, interested in
          analysis and topology. I keep notes, work through problems, and write
          about the ideas I find beautiful.
        </p>

        {/* Actions */}
        <div
          className="hero-focus mt-8 flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: '0.52s' }}
        >
          <Link
            href="/cv"
            className="btn-sheen hero-cta-pulse group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--bg)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Curriculum Vitae
          </Link>
          <Link
            href="/blog"
            className="btn-sheen group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-5 text-sm font-medium text-[var(--text)] transition-colors duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Read the blog
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
          </Link>
        </div>

        {/* Facts — staggered focus-in, value shimmer */}
        <dl className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
          {profileFacts.map(({ label, value, Icon }, i) => (
            <div
              key={label}
              className="hero-focus flex items-start gap-3 bg-[var(--surface)] p-5"
              style={{ animationDelay: `${0.64 + i * 0.1}s` }}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="text-[0.7rem] font-semibold uppercase tracking-[var(--tracking-wide)] text-[var(--text-subtle)]">
                  {label}
                </dt>
                <dd className="hero-value-shimmer mt-1 text-sm font-medium text-[var(--text)]">
                  {value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
