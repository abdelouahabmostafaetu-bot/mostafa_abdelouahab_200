export default function ProfileSection() {
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid gap-6 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:p-8">
          <div className="mx-auto h-40 w-40 overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-bg)] md:mx-0 md:h-44 md:w-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/profile/main-photo.jpg"
              alt="Abdelouahab Mostafa"
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              About
            </p>
            <h2
              className="mt-3 text-2xl font-semibold text-[var(--color-text)] md:text-3xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Abdelouahab Mostafa
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] md:text-base">
              Master student in fundamental mathematics at the University of Mila,
              writing short explanations and longer articles on analysis, topology,
              and classical problem solving.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5 text-sm text-[var(--color-text-secondary)]">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5">
                University of Mila
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5">
                Fundamental Mathematics
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5">
                Mila, Algeria
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
