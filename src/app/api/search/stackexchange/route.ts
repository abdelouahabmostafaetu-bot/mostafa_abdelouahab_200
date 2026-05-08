import { type NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STACK_EXCHANGE_API = 'https://api.stackexchange.com/2.3';

function getPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getSafePageSize(value: string | null) {
  const parsed = getPositiveInteger(value, 20);
  return Math.min(Math.max(parsed, 1), 100);
}

async function proxyStackExchangeRequest(request: NextRequest, path = 'search/advanced') {
  const limited = checkRateLimit(request, 'stackexchange-search', 120);
  if (limited) return limited;

  const incomingParams = request.nextUrl.searchParams;
  const params = new URLSearchParams(incomingParams);
  params.set('page', String(getPositiveInteger(incomingParams.get('page'), 1)));
  params.set('pagesize', String(getSafePageSize(incomingParams.get('pagesize'))));
  params.delete('mode');
  params.delete('key');

  const status = incomingParams.get('status');
  if (!params.get('accepted') && (status === 'true' || status === 'false')) {
    params.set('accepted', status);
  }
  params.delete('status');

  if (!params.get('site')) {
    params.set('site', 'math');
  }

  const apiKey = process.env.STACK_EXCHANGE_API_KEY?.trim();
  if (apiKey) {
    params.set('key', apiKey);
  }

  const response = await fetch(`${STACK_EXCHANGE_API}/${path}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({
    items: [],
    has_more: false,
    error_message: 'Stack Exchange returned an invalid response.',
  }));

  return NextResponse.json(payload, { status: response.ok ? 200 : response.status });
}

export async function GET(request: NextRequest) {
  return proxyStackExchangeRequest(request);
}

export { proxyStackExchangeRequest };
