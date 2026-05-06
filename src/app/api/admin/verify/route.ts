import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'admin-verify', 10);
  if (limited) return limited;

  await request.json().catch(() => null);
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  return NextResponse.json({ ok: true }, { status: 200 });
}

