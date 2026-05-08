export default function BlogAdminLoading() {
  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <div className="h-9 w-56 animate-pulse rounded bg-[var(--color-bg-muted)]" />
          <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-[var(--color-bg-muted)]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
