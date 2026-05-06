import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/chat(.*)', '/dashboard(.*)']);
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/blog/admin(.*)',
  '/library/admin(.*)',
  '/manage-blog(.*)',
  '/manage-library(.*)',
]);
const isAdminApiRoute = createRouteMatcher([
  '/api/admin(.*)',
  '/api/blog-assets(.*)',
  '/api/blog/upload-image(.*)',
  '/api/blog-preview(.*)',
  '/api/library/get-upload-url(.*)',
  '/api/library/upload-book-file(.*)',
  '/api/library/upload-cover(.*)',
  '/api/problems-with-coffee/upload-image(.*)',
]);
const isContentMutationApi = createRouteMatcher([
  '/api/blog-posts(.*)',
  '/api/books(.*)',
  '/api/library/books(.*)',
  '/api/problems(.*)',
  '/api/problems-with-coffee(.*)',
]);

function isMutationMethod(method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

export default clerkMiddleware(async (auth, request) => {
  const shouldProtectApi =
    isAdminApiRoute(request) ||
    (isMutationMethod(request.method) && isContentMutationApi(request));

  if (shouldProtectApi) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    return;
  }

  if (isProtectedRoute(request) || isAdminRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
