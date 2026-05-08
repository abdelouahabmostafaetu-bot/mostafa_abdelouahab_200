export default function ProblemDetailLoading() {
  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="problem-page mx-auto w-full px-4 pb-14 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
        <main className="problem-detail-container">
          <header className="problem-detail-header">
            <div className="mb-3 h-4 w-40 animate-pulse rounded bg-[var(--color-bg-muted)]" />
            <div className="space-y-3">
              <div className="h-8 w-11/12 animate-pulse rounded bg-[var(--color-bg-muted)]" />
              <div className="h-8 w-7/12 animate-pulse rounded bg-[var(--color-bg-muted)]" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="h-7 w-20 animate-pulse rounded-full bg-[var(--color-bg-muted)]" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--color-bg-muted)]" />
              <div className="h-7 w-16 animate-pulse rounded-full bg-[var(--color-bg-muted)]" />
            </div>
          </header>
          <section className="problem-detail-section">
            <div className="mb-4 h-3 w-20 animate-pulse rounded bg-[var(--color-bg-muted)]" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-4 animate-pulse rounded bg-[var(--color-bg-muted)]"
                  style={{ width: `${index % 3 === 0 ? 96 : index % 3 === 1 ? 84 : 72}%` }}
                />
              ))}
            </div>
          </section>
        </main>
      </div>
    </section>
  );
}
