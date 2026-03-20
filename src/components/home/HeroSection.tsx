import { Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="pt-28 pb-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-center">
          <div className="fade-in-up">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Mathematics Research Notes
            </p>
            <h1
              className="max-w-3xl text-5xl font-semibold leading-[1.05] text-[var(--color-text)] md:text-6xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              A simpler academic website for writing, ideas, and clear mathematics.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
              I am Abdelouahab Mostafa, a master student in fundamental mathematics.
              This site collects articles, short notes, and research-oriented writing in
              analysis, topology, and related areas.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-text)] px-5 py-3 text-sm font-semibold text-[var(--color-bg)] transition-all duration-200 hover:opacity-90"
              >
                Read the blog
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text)] transition-all duration-200 hover:bg-[var(--color-hover)]"
              >
                <Mail size={15} />
                Contact me
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 text-sm text-[var(--color-text-secondary)]">
              {['Analysis', 'Topology', 'Dynamical systems', 'Integrals and series'].map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <aside className="fade-in rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/profile/main-photo.jpg"
                  alt="Abdelouahab Mostafa"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--color-text)]">
                  Abdelouahab Mostafa
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Master student in fundamental mathematics at the University of Mila.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4 border-t border-[var(--color-border)] pt-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                  Focus
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Exact evaluation, classical analysis, and clear exposition of abstract ideas.
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                  Based in
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Mila, Algeria
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
