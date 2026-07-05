import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getSessionUser, isAdminEmail, type SessionUser } from '@/lib/auth';

/**
 * Admin authorization built on the custom Google OAuth + MongoDB session
 * system (see src/lib/auth.ts). Admin access is granted to the account
 * whose Google email matches the ADMIN_EMAIL environment variable.
 *
 * The function names and behaviors intentionally match the previous
 * implementation so every admin page and API route keeps working:
 *  - getCurrentAdminUser() — admin user or null (safe for checks)
 *  - requireAdmin()        — redirects when not admin (server pages)
 *  - requireAdminApi()     — 401/403 response when not admin (API routes)
 */

export async function getCurrentAdminUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return isAdminEmail(user.email) ? user : null;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect('/sign-in');
  }

  if (!isAdminEmail(user.email)) {
    redirect('/');
  }

  return user;
}

export async function requireAdminApi(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: 'Admin access required.' },
      { status: 403 },
    );
  }

  return null;
}
