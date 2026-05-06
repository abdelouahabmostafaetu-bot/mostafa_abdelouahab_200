import { randomUUID } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

const CODE_FENCE_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g;
const UNSAFE_HTML_TAG_PATTERN =
  /<\/?\s*(script|iframe|object|embed|base|link|meta|form|input|button|textarea|select|option|svg|math|style)\b[^>]*>/gi;
const EVENT_HANDLER_ATTRIBUTE_PATTERN =
  /\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\}|[^\s>]+)/g;
const DANGEROUS_URL_ATTRIBUTE_PATTERN =
  /\s+(href|src)\s*=\s*(?:"\s*(javascript:|vbscript:|data:text\/html)[^"]*"|'\s*(javascript:|vbscript:|data:text\/html)[^']*'|\{?\s*["']?\s*(javascript:|vbscript:|data:text\/html)[^}\s>]*\}?)/gi;
const DANGEROUS_MARKDOWN_LINK_PATTERN =
  /\]\(\s*(javascript:|vbscript:|data:text\/html)[^)]+\)/gi;

const MIME_EXTENSION_MAP = new Map([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
]);

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

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function getUnknownFields(
  body: unknown,
  allowedFields: readonly string[],
): string[] {
  if (!isPlainObject(body)) {
    return [];
  }

  const allowed = new Set(allowedFields);
  return Object.keys(body).filter((field) => !allowed.has(field));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeMarkdownChunk(value: string): string {
  return value
    .replace(UNSAFE_HTML_TAG_PATTERN, (tag) => escapeHtml(tag))
    .replace(EVENT_HANDLER_ATTRIBUTE_PATTERN, '')
    .replace(DANGEROUS_URL_ATTRIBUTE_PATTERN, '')
    .replace(DANGEROUS_MARKDOWN_LINK_PATTERN, '](#)');
}

export function sanitizeMarkdownSource(source: string): string {
  return source
    .split(CODE_FENCE_PATTERN)
    .map((chunk) => {
      if (chunk.startsWith('```') || chunk.startsWith('~~~')) {
        return chunk;
      }

      return sanitizeMarkdownChunk(chunk);
    })
    .join('');
}

export function getSafeExtensionForMime(contentType: string): string {
  return MIME_EXTENSION_MAP.get(contentType.toLowerCase()) ?? 'bin';
}

export function createSafeBlobPath(folder: string, contentType: string): string {
  const safeFolder = folder.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9/_-]/g, '');
  return `${safeFolder}/${Date.now()}-${randomUUID()}.${getSafeExtensionForMime(contentType)}`;
}

