import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  MapPin,
  ArrowRight,
  FileText,
} from 'lucide-react';

const profileFacts = [
  { label: 'Institution', value: 'University of Mila', Icon: GraduationCap },
  { label: 'Department', value: 'Fundamental Mathematics', Icon: BookOpen },
  { label: 'Location', value: 'Mila, Algeria', Icon: MapPin },
] as const;

export default function ProfileSection() {
  return (
    <section className="mx-auto max-w-wide px-4 pt-14 sm:px-6 md:pt-20">
      {/* Eyebrow */}
      <p className="text-[0.7rem] font-semibold uppercase tracking-[var(--tracking-wide)] text-[var(--accent)]">
        Mathematics Researcher
      </p>

      {/* Name */}
      <h1 className="mt-4 font-serif text-4xl leading-[1.05] text-[var(--text)] sm:text-5xl md:text-6xl">
        Abdelouahab Mostafa
      </h1>

      {/* Lede */}
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-muted)]">
        Master&rsquo;s student in fundamental mathematics, interested in
        analysis and topology. I keep notes, work through problems, and write
        about the ideas I find beautiful.
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/cv"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--bg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] motion-reduce:transition-none"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          Curriculum Vitae
        </Link>
        <Link
          href="/blog"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-5 text-sm font-medium text-[var(--text)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
        >
          Read the blog
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Facts */}
      <dl className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
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
    </section>
  );
}
