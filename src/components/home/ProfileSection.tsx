import Link from 'next/link';
import SiteIcon, { type SiteIconName } from '@/components/ui/SiteIcon';

const profileFacts = [
  { label: 'Institution', value: 'University of Mila', icon: 'research' },
  { label: 'Program', value: 'Fundamental Mathematics', icon: 'math' },
  { label: 'Location', value: 'Mila, Algeria', icon: 'home' },
] satisfies Array<{ label: string; value: string; icon: SiteIconName }>;

const interests = ['Analysis', 'Topology', 'Dynamical systems', 'Mathematical writing'];

export default function ProfileSection() {
  return (
    <section className="relative overflow-hidden py-12 md:py-20">
      <div className="academic-shell">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-stretch">
          <div className="academic-card rounded-[2rem] p-6 sm:p-8 md:p-12">
            <p className="academic-kicker mb-5">
              <SiteIcon name="research" alt="" className="h-4 w-4" />
              Academic profile
            </p>

            <h1 className="academic-title max-w-3xl text-[clamp(2.6rem,8vw,5.6rem)] leading-[0.95]">
              Abdelouahab Mostafa
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] md:text-lg">
              Master&apos;s student in Fundamental Mathematics at the University of Mila.
              This website collects research-oriented notes, mathematical problems,
              articles, and learning resources in a calm academic format.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cv"
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                View CV
              </Link>
              <Link
                href="/notes"
                className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-5 py-3 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                Read notes
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full border border-transparent px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
              >
                Contact
              </Link>
            </div>
          </div>

          <aside className="academic-card rounded-[2rem] p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="academic-kicker">
                <SiteIcon name="document" alt="" className="h-4 w-4" />
                Details
              </p>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-text-tertiary)]">
                Mathematics
              </span>
            </div>

            <div className="space-y-5">
              {profileFacts.map((item) => (
                <div key={item.label} className="border-b border-[var(--color-border)] pb-5 last:border-b-0 last:pb-0">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                    <SiteIcon name={item.icon} alt="" className="h-4 w-4" />
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-[var(--color-text)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                Interests
              </p>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)]"
                  >
                    {interest}
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
