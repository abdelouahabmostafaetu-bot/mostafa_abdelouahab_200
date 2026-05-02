import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'admin-verify', 10);
  if (limited) return limited;

  await request.json().catch(() => null);
  await requireAdmin();

  return NextResponse.json({ ok: true }, { status: 200 });
}

