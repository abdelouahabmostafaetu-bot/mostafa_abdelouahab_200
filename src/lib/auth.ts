import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/session-token';

/** Name of the httpOnly session cookie. */
export const SESSION_COOKIE = 'am_session';
/** Short-lived cookie carrying the OAuth state + post-login redirect. */
export const OAUTH_STATE_COOKIE = 'am_oauth_state';
/** Sessions last 30 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string;
};

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not configured.');
  }
  return secret;
}

/**
 * Reads and verifies the session cookie. Returns the signed-in user
 * or null. Safe to call from any server component or API route.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token, getAuthSecret());
    if (!payload) return null;

    return {
      id: payload.sub,
      email: payload.email ?? '',
      name: payload.name ?? '',
      image: payload.image ?? '',
    };
  } catch (error) {
    console.error('getSessionUser failed:', error);
    return null;
  }
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !email) return false;
  return email.trim().toLowerCase() === adminEmail;
}
