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
    <section className="relative overflow-hidden border-b border-[var(--color-border)] pt-28 md:pt-36">
      <div className="university-container pb-14 md:pb-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="university-kicker mb-5">
              <span className="h-px w-8 bg-[var(--color-accent)]" />
              Personal academic website
            </p>

            <h1 className="university-title max-w-4xl text-[clamp(3rem,8vw,6.6rem)]">
              Abdelouahab Mostafa
            </h1>

            <p className="university-body mt-6 max-w-2xl text-base md:text-xl">
              Master&apos;s student in fundamental mathematics at the University of Mila,
              focused on clear mathematical exposition, research notes, and problem solving.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/cv" className="university-button-primary">
                View Curriculum Vitae
              </Link>
              <Link href="/notes" className="university-button-secondary">
                Read mathematical notes
              </Link>
            </div>
          </div>

          <div className="university-card rounded-[2rem] p-5 md:p-7">
            <div className="flex items-start justify-between gap-5 border-b border-[var(--color-border)] pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                  Research profile
                </p>
                <h2 className="mt-2 font-serif text-2xl font-normal text-[var(--color-text)]">
                  Mathematics, notes, and academic work
                </h2>
              </div>
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#172033] font-serif text-lg text-[#f7f3ea]">
                AM
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {profileFacts.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-muted)]">
                    <SiteIcon name={item.icon} alt="" className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold text-[var(--color-text)] md:text-base">
                      {item.value}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full border border-[var(--color-border)] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
