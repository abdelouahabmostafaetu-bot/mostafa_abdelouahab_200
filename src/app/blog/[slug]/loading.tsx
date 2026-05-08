export default function BlogPostLoading() {
  return (
    <div className="bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.10),transparent_34rem)] pb-12 pt-16 md:pb-20 md:pt-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-6 h-8 w-28 animate-pulse rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/70 md:mb-10" />
        <div className="mx-auto max-w-[52rem] py-2 md:rounded-2xl md:border md:border-[var(--color-border)] md:bg-[var(--color-surface)] md:p-10 md:shadow-[0_24px_80px_rgba(0,0,0,0.22)] lg:p-12">
          <div className="mb-8 flex gap-2">
            <div className="h-6 w-24 animate-pulse rounded-full bg-[var(--color-bg-muted)]" />
            <div className="h-6 w-32 animate-pulse rounded-full bg-[var(--color-bg-muted)]" />
          </div>
          <div className="space-y-3">
            <div className="h-12 w-11/12 animate-pulse rounded bg-[var(--color-bg-muted)] md:h-16" />
            <div className="h-12 w-3/4 animate-pulse rounded bg-[var(--color-bg-muted)] md:h-16" />
          </div>
          <div className="mt-7 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-[var(--color-bg-muted)]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--color-bg-muted)]" />
          </div>
          <div className="mt-12 space-y-4 border-t border-[var(--color-border)]/70 pt-8">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-4 animate-pulse rounded bg-[var(--color-bg-muted)]"
                style={{ width: `${index % 3 === 0 ? 92 : index % 3 === 1 ? 78 : 86}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
