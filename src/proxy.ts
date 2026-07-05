import { NextRequest, NextResponse } from 'next/server';
import {
  verifySessionToken,
  type SessionPayload,
} from '@/lib/session-token';

/**
 * Route protection middleware built on the custom Google OAuth + MongoDB
 * session system (no third-party auth). Sessions are verified with Web
 * Crypto, so this runs fine in the Edge runtime.
 */

const SESSION_COOKIE = 'am_session';

const PROTECTED_PAGES = [/^\/chat(\/.*)?$/, /^\/dashboard(\/.*)?$/];
const ADMIN_PAGES = [
  /^\/admin(\/.*)?$/,
  /^\/blog\/admin(\/.*)?$/,
  /^\/library\/admin(\/.*)?$/,
  /^\/manage-blog(\/.*)?$/,
  /^\/manage-library(\/.*)?$/,
];
const ADMIN_API_PREFIXES = [
  '/api/admin',
  '/api/blog-assets',
  '/api/blog/upload-image',
  '/api/blog-preview',
  '/api/library/get-upload-url',
  '/api/library/upload-book-file',
  '/api/library/upload-cover',
  '/api/problems-with-coffee/upload-image',
];
const CONTENT_MUTATION_API_PREFIXES = [
  '/api/blog-posts',
  '/api/books',
  '/api/library/books',
  '/api/problems',
  '/api/problems-with-coffee',
  '/api/doctorate-problems',
];

function matchesAny(pathname: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(pathname));
}

function hasPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p));
}

function isMutationMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

async function getSession(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET?.trim();
  if (!token || !secret) return null;
  return verifySessionToken(token, secret);
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* Admin/upload APIs and content mutations require a signed-in user.
     (Each route additionally enforces the admin email itself.) */
  const shouldProtectApi =
    hasPrefix(pathname, ADMIN_API_PREFIXES) ||
    (isMutationMethod(request.method) &&
      hasPrefix(pathname, CONTENT_MUTATION_API_PREFIXES));

  if (shouldProtectApi) {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  const isAdminPage = matchesAny(pathname, ADMIN_PAGES);
  if (isAdminPage || matchesAny(pathname, PROTECTED_PAGES)) {
    const session = await getSession(request);
    if (!session) {
      const signInUrl = new URL('/sign-in', request.nextUrl.origin);
      signInUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (isAdminPage) {
      const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const sessionEmail = (session.email ?? '').trim().toLowerCase();
      if (!adminEmail || sessionEmail !== adminEmail) {
        return NextResponse.redirect(new URL('/', request.nextUrl.origin));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
