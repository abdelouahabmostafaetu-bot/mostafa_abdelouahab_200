import Link from 'next/link';

const profileFacts = [
  { label: 'Institution', value: 'University of Mila' },
  { label: 'Program', value: 'Fundamental Mathematics' },
  { label: 'Location', value: 'Mila, Algeria' },
];

const researchAreas = ['Analysis', 'Topology', 'Dynamical systems', 'Mathematical writing'];

export default function ProfileSection() {
  return (
    <section className="border-b border-[var(--color-border)] pt-28 sm:pt-32">
      <div className="academic-shell pb-14 md:pb-20">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <p className="academic-kicker mb-5">Personal academic website</p>
            <h1 className="academic-title max-w-4xl text-[clamp(2.6rem,8vw,5.8rem)]">
              Abdelouahab Mostafa
            </h1>
            <p className="academic-subtitle mt-6 max-w-2xl">
              Master&apos;s student in fundamental mathematics at the University of Mila,
              Algeria. This website gathers notes, mathematical problems, reading
              material, and research-oriented writing.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cv" className="academic-button academic-button-primary">
                View CV
              </Link>
              <Link href="/notes" className="academic-button">
                Read notes
              </Link>
              <Link href="/contact" className="academic-button">
                Contact
              </Link>
            </div>
          </div>

          <aside className="academic-card p-6 md:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Academic profile
            </p>
            <div className="mt-5 space-y-4">
              {profileFacts.map((item) => (
                <div key={item.label} className="border-t border-[var(--color-border)] pt-4 first:border-t-0 first:pt-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                    {item.label}
                  </p>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{item.value}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-10 grid gap-3 border-t border-[var(--color-border)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {researchAreas.map((area) => (
            <div
              key={area}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] shadow-sm"
            >
              {area}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
