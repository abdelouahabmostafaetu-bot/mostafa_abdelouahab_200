import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

export const metadata = {
  title: 'Chat',
};

export default async function ChatPage() {
  await auth.protect();

  return (
    <div className="pt-20 pb-20">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-[var(--color-accent)] font-medium mb-2">
          Protected
        </p>
        <h1
          className="text-2xl md:text-4xl font-semibold text-[var(--color-text)] mb-3"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Chat
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] leading-6">
          You are signed in. This is a simple protected page placeholder.
        </p>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
