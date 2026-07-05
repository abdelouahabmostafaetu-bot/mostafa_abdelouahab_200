import { NextResponse } from 'next/server';
import { getSessionUser, isAdminEmail } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me — returns the signed-in user (or null) for client
 * components such as the navbar and the Math AI chat.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: { ...user, isAdmin: isAdminEmail(user.email) },
  });
}
