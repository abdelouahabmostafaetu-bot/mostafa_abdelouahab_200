import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function signOut(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.nextUrl.origin));
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/** GET or POST /api/auth/signout — clears the session and goes home. */
export async function GET(request: NextRequest) {
  return signOut(request);
}

export async function POST(request: NextRequest) {
  return signOut(request);
}
