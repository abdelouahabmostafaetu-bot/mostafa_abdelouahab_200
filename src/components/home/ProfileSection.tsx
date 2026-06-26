import Link from 'next/link';
import SiteIcon, { type SiteIconName } from '@/components/ui/SiteIcon';

const profileFacts = [
  { label: 'Institution', value: 'University of Mila', icon: 'research' },
  { label: 'Program', value: 'Fundamental Mathematics', icon: 'math' },
  { label: 'Location', value: 'Mila, Algeria', icon: 'home' },
] satisfies Array<{ label: string; value: string; icon: SiteIconName }>;

const researchAreas = ['Analysis', 'Topology', 'Dynamical systems', 'Mathematical writing'];

export default function ProfileSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--color-border)] py-12 sm:py-16 lg:py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(167,111,43,0.12),transparent_26rem)]" />

      <div className="university-container">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="university-eyebrow mb-5">
              <SiteIcon name="document" alt="" className="h-4 w-4" />
              Academic profile
            </p>

            <h1 className="university-heading max-w-4xl text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              Abdelouahab Mostafa
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)] sm:text-xl">
              Master&apos;s student in fundamental mathematics, building a clean academic space for research notes, mathematical problems, and university-oriented writing.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cv" className="university-button-primary px-5 py-3 text-sm">
                View CV
              </Link>
              <Link href="/blog" className="university-button-secondary px-5 py-3 text-sm">
                Read articles
              </Link>
              <Link href="/notes" className="university-button-secondary px-5 py-3 text-sm">
                Study notes
              </Link>
            </div>
          </div>

          <aside className="university-card rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent)] font-serif text-2xl text-white shadow-sm">
                AM
              </div>
              <div>
                <p className="font-serif text-2xl text-[var(--color-text)]">Mathematics</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Research & learning portfolio</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {profileFacts.map((item) => (
                <div key={item.label} className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-accent)]">
                    <SiteIcon name={item.icon} alt="" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 border-t border-[var(--color-border)] pt-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                Focus areas
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {researchAreas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full border border-[var(--color-border)] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
