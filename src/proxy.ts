import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/chat(.*)', '/dashboard(.*)']);
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/blog/admin(.*)',
  '/library/admin(.*)',
  '/manage-blog(.*)',
  '/manage-library(.*)',
  '/api/admin(.*)',
  '/api/blog-assets(.*)',
  '/api/blog-preview(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
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
