import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/models/user';
import { createSessionToken, verifySessionToken } from '@/lib/session-token';
import {
  getAuthSecret,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failRedirect(request: NextRequest, reason: string) {
  const url = new URL('/sign-in', request.nextUrl.origin);
  url.searchParams.set('error', reason);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

/**
 * GET /api/auth/callback/google — completes the Google sign-in:
 * verifies the state, exchanges the code for tokens, loads the Google
 * profile, upserts the user in MongoDB, and sets the session cookie.
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      return failRedirect(request, 'not-configured');
    }

    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    if (!code || !state) {
      return failRedirect(request, 'missing-code');
    }

    /* CSRF check: the state must match the signed cookie we set. */
    const stateToken = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
    if (!stateToken) {
      return failRedirect(request, 'state-expired');
    }
    const statePayload = await verifySessionToken(stateToken, getAuthSecret());
    if (!statePayload || statePayload.sub !== state) {
      return failRedirect(request, 'state-mismatch');
    }
    const redirectPath =
      statePayload.name &&
      statePayload.name.startsWith('/') &&
      !statePayload.name.startsWith('//')
        ? statePayload.name
        : '/dashboard';

    /* Exchange the authorization code for an access token. */
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${request.nextUrl.origin}/api/auth/callback/google`,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenRes.json().catch(() => null)) as {
      access_token?: string;
    } | null;
    if (!tokenRes.ok || !tokenData?.access_token) {
      console.error('Google token exchange failed:', tokenData);
      return failRedirect(request, 'token-exchange-failed');
    }

    /* Load the verified Google profile. */
    const profileRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );
    const profile = (await profileRes.json().catch(() => null)) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    } | null;
    if (!profileRes.ok || !profile?.sub || !profile.email) {
      return failRedirect(request, 'profile-failed');
    }
    if (profile.email_verified === false) {
      return failRedirect(request, 'email-not-verified');
    }

    /* Create or update the account in MongoDB. */
    await connectToDatabase();
    const user = await User.findOneAndUpdate(
      { googleId: profile.sub },
      {
        $set: {
          email: profile.email.toLowerCase(),
          name: profile.name ?? '',
          image: profile.picture ?? '',
          lastLoginAt: new Date(),
        },
        $setOnInsert: { googleId: profile.sub },
      },
      { upsert: true, new: true },
    );

    /* Issue the session cookie (30 days). */
    const sessionToken = await createSessionToken(
      {
        sub: String(user._id),
        email: profile.email.toLowerCase(),
        name: profile.name ?? '',
        image: profile.picture ?? '',
        exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
      },
      getAuthSecret(),
    );

    const response = NextResponse.redirect(
      new URL(redirectPath, request.nextUrl.origin),
    );
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error('Google OAuth callback failed:', error);
    return failRedirect(request, 'unexpected');
  }
}
