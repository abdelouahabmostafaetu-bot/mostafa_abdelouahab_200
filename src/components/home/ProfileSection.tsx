import Link from 'next/link';
import { GraduationCap, BookOpen, MapPin, ArrowRight, FileText } from 'lucide-react';

const profileFacts = [
  { label: 'Institution', value: 'University of Mila', Icon: GraduationCap },
  { label: 'Department', value: 'Fundamental Mathematics', Icon: BookOpen },
  { label: 'Location', value: 'Mila, Algeria', Icon: MapPin },
] as const;

export default function ProfileSection() {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 pt-16 pb-10 md:pt-24 md:pb-14">
      {/* Eyebrow */}
      <p className="mb-5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
        Mathematics Researcher
      </p>

      {/* Name */}
      <h1
        className="font-normal text-[var(--color-text)]"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(2.4rem, 7vw, 3.6rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
        }}
      >
        Abdelouahab Mostafa
      </h1>

      {/* Lede */}
      <p
        className="mt-6 max-w-[52ch] text-[var(--color-text-secondary)]"
        style={{ fontSize: '1.075rem', lineHeight: 1.7 }}
      >
        Master&rsquo;s student in fundamental mathematics, interested in analysis
        and topology. I keep notes, work through problems, and write about the
        ideas I find beautiful.
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/cv"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
          }}
        >
          <FileText size={16} />
          Curriculum Vitae
        </Link>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          Read the blog
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Facts */}
      <dl className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-3"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-border)' }}
      >
        {profileFacts.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="flex flex-col gap-2 p-5"
            style={{ background: 'var(--color-bg-elevated)' }}
          >
            <div className="flex items-center gap-2">
              <Icon size={15} style={{ color: 'var(--color-accent)' }} />
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
                {label}
              </dt>
            </div>
            <dd className="text-[0.95rem] text-[var(--color-text)]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
