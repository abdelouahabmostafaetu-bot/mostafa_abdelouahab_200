import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
};

const ERROR_MESSAGES: Record<string, string> = {
  'not-configured':
    'Google sign-in is not configured yet. Please try again later.',
  'missing-code': 'The sign-in was cancelled. Please try again.',
  'state-expired': 'The sign-in session expired. Please try again.',
  'state-mismatch': 'Security check failed. Please try again.',
  'token-exchange-failed': 'Google sign-in failed. Please try again.',
  'profile-failed': 'Could not load your Google profile. Please try again.',
  'email-not-verified': 'Your Google email address is not verified.',
  unexpected: 'Something went wrong. Please try again.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirect?: string;
    redirect_url?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const rawTarget = params.redirect ?? params.redirect_url ?? '/dashboard';
  const target =
    rawTarget.startsWith('/') && !rawTarget.startsWith('//')
      ? rawTarget
      : '/dashboard';

  const user = await getSessionUser();
  if (user) {
    redirect(target);
  }

  const errorMessage = params.error
    ? (ERROR_MESSAGES[params.error] ?? ERROR_MESSAGES.unexpected)
    : '';

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pb-16 pt-24">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 font-serif text-lg font-bold text-[var(--color-accent)]">
            AM
          </div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--color-text)]">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            Sign in to access your dashboard, downloads, and Math AI.
          </p>

          {errorMessage && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/15 px-4 py-2.5 text-xs text-red-300">
              {errorMessage}
            </p>
          )}

          <div className="mt-6">
            <GoogleSignInButton redirect={target} />
          </div>

          <p className="mt-5 text-[11px] leading-5 text-[var(--color-text-tertiary)]">
            Secure sign-in — we only receive your name, email address, and
            profile photo. No passwords are stored.
          </p>
        </div>

        <p className="mt-6 text-center text-xs">
          <Link
            href="/"
            className="text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-accent)]"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
