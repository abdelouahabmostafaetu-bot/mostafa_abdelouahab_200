import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/session-token';
import { getAuthSecret, OAUTH_STATE_COOKIE } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Only allow same-site relative paths as post-login destinations. */
function sanitizeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}

/**
 * GET /api/auth/google — starts the "Sign in with Google" flow.
 * Stores a signed state (CSRF protection) + the redirect target in a
 * short-lived cookie, then sends the user to Google's consent screen.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      {
        error:
          'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      },
      { status: 500 },
    );
  }

  const origin = request.nextUrl.origin;
  const redirectPath = sanitizeRedirect(
    request.nextUrl.searchParams.get('redirect') ??
      request.nextUrl.searchParams.get('redirect_url'),
  );

  const state = crypto.randomUUID();
  const stateToken = await createSessionToken(
    {
      sub: state,
      email: '',
      name: redirectPath,
      image: '',
      exp: Math.floor(Date.now() / 1000) + 600,
    },
    getAuthSecret(),
  );

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', `${origin}/api/auth/callback/google`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, stateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return response;
}
