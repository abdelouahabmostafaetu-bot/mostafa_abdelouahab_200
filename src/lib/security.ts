import crypto from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ENV_KEYS = ['ADMIN_PASSWORD', 'LIBRARY_ADMIN_PASSWORD'];
const RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function getConfiguredAdminPassword(): string {
  for (const key of ADMIN_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return '';
}

export function isAdminPasswordConfigured(): boolean {
  return Boolean(getConfiguredAdminPassword());
}

export function isAdminPasswordValid(password: string | null | undefined): boolean {
  const configuredPassword = getConfiguredAdminPassword();
  const providedPassword = String(password ?? '');

  if (!configuredPassword || !providedPassword) {
    return false;
  }

  const configuredBuffer = Buffer.from(configuredPassword);
  const providedBuffer = Buffer.from(providedPassword);

  if (configuredBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(configuredBuffer, providedBuffer);
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    forwardedFor ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'local'
  );
}

export function checkRateLimit(
  request: NextRequest,
  scope: string,
  maxRequests: number,
): NextResponse | null {
  const now = Date.now();
  const key = `${scope}:${getClientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  bucket.count += 1;

  if (bucket.count <= maxRequests) {
    return null;
  }

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    },
  );
}

