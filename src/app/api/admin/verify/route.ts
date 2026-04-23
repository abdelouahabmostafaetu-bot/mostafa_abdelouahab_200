import { type NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  isAdminPasswordConfigured,
  isAdminPasswordValid,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'admin-verify', 10);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as
    | { password?: string }
    | null;

  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      {
        error:
          'Admin password is not configured. Add ADMIN_PASSWORD to your environment variables.',
      },
      { status: 503 },
    );
  }

  if (!isAdminPasswordValid(body?.password)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

