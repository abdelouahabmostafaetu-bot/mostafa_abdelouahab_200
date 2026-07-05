import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign up',
};

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pb-16 pt-24">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 font-serif text-lg font-bold text-[var(--color-accent)]">
            AM
          </div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--color-text)]">
            Create your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            One click with Google — no passwords, no forms. Your account is
            created automatically on first sign-in.
          </p>

          <div className="mt-6">
            <GoogleSignInButton redirect="/dashboard" />
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
