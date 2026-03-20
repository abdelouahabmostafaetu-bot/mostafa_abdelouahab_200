import { Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="pt-24 pb-8 md:pt-28 md:pb-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid gap-8 md:gap-10 lg:grid-cols-[minmax(0,1.2fr)_280px] lg:items-center">
          <div className="fade-in-up">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Mathematics Research Notes
            </p>
            <h1
              className="max-w-3xl text-4xl font-semibold leading-[1.08] text-[var(--color-text)] md:text-5xl lg:text-6xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              A simpler academic website for writing, ideas, and clear mathematics.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)] md:mt-6 md:text-lg md:leading-8">
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

            <div className="mt-8 flex flex-wrap gap-2.5 text-sm text-[var(--color-text-secondary)] md:mt-10 md:gap-3">
              {['Analysis', 'Topology', 'Dynamical systems', 'Integrals and series'].map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 md:px-4 md:py-2"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <aside className="fade-in rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
              Quick profile
            </p>
            <div className="mt-5 space-y-4 border-t border-[var(--color-border)] pt-5">
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
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                  Writing style
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Clear notes for students, problem solvers, and readers who enjoy rigorous ideas.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
