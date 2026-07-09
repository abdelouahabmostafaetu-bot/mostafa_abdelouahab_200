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

export default function ProfileSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated math art + gradient mesh (lazy, behind content) */}
      <HeroArt />

      <div className="relative z-10 mx-auto max-w-wide px-4 pb-16 pt-16 sm:px-6 md:pb-24 md:pt-24">
        {/* Eyebrow */}
        <p className="eyebrow rise" style={{ animationDelay: '0.05s' }}>
          Mathematics Researcher
        </p>

        {/* Name */}
        <h1
          className="display-title rise mt-4 max-w-3xl text-[var(--text)]"
          style={{ animationDelay: '0.12s' }}
        >
          Abdelouahab Mostafa
        </h1>

        {/* Lede */}
        <p
          className="rise mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-muted)]"
          style={{ animationDelay: '0.2s' }}
        >
          Master&rsquo;s student in fundamental mathematics, interested in
          analysis and topology. I keep notes, work through problems, and write
          about the ideas I find beautiful.
        </p>

        {/* Actions */}
        <div
          className="rise mt-8 flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: '0.28s' }}
        >
          <Link
            href="/cv"
            className="btn-sheen group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--bg)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
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

        {/* Facts */}
        <dl
          className="rise mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3"
          style={{ animationDelay: '0.36s' }}
        >
          {profileFacts.map(({ label, value, Icon }) => (
            <div
              key={label}
              className="flex items-start gap-3 bg-[var(--surface)] p-5"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="text-[0.7rem] font-semibold uppercase tracking-[var(--tracking-wide)] text-[var(--text-subtle)]">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--text)]">
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
