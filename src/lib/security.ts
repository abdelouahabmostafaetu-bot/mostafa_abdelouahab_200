import { randomUUID } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

const CODE_FENCE_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g;
const HTML_TAG_PATTERN = /<\/?\s*([A-Za-z][A-Za-z0-9:-]*)(?:\s+[^<>]*)?\/?>/g;
const HTML_ATTRIBUTE_PATTERN =
  /\s+([A-Za-z_:][A-Za-z0-9_:.-]*)(?:\s*=\s*("[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\}|[^\s"'=<>`]+))?/g;
const DANGEROUS_MARKDOWN_LINK_PATTERN =
  /\]\(\s*(javascript:|vbscript:|data:|file:)[^)]+\)/gi;

const SAFE_HTML_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'details',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'summary',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);
const SAFE_HTML_ATTRIBUTES = new Set([
  'alt',
  'class',
  'classname',
  'height',
  'href',
  'id',
  'rel',
  'src',
  'style',
  'target',
  'title',
  'width',
]);
const URL_HTML_ATTRIBUTES = new Set(['href', 'src']);
const DANGEROUS_PROTOCOL_PATTERN = /^\s*(?:javascript|vbscript|data|file):/i;
const DANGEROUS_STYLE_PATTERN = /(?:expression\s*\(|javascript:|vbscript:|data:|file:)/i;

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

function unwrapAttributeValue(value: string): string {
  return value
    .trim()
    .replace(/^\{+|}+$/g, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function isSafeHtmlAttribute(name: string, value: string | undefined): boolean {
  const lowerName = name.toLowerCase();

  if (lowerName.startsWith('on')) {
    return false;
  }

  if (
    !SAFE_HTML_ATTRIBUTES.has(lowerName) &&
    !lowerName.startsWith('aria-') &&
    !lowerName.startsWith('data-')
  ) {
    return false;
  }

  if (!value) {
    return true;
  }

  const unwrappedValue = unwrapAttributeValue(value);
  if (URL_HTML_ATTRIBUTES.has(lowerName)) {
    return !DANGEROUS_PROTOCOL_PATTERN.test(unwrappedValue);
  }

  if (lowerName === 'style') {
    return !DANGEROUS_STYLE_PATTERN.test(unwrappedValue);
  }

  return true;
}

function sanitizeAllowedHtmlTag(tag: string, tagName: string): string {
  const lowerTagName = tagName.toLowerCase();

  if (!SAFE_HTML_TAGS.has(lowerTagName)) {
    return escapeHtml(tag);
  }

  if (/^<\s*\//.test(tag)) {
    return `</${lowerTagName}>`;
  }

  const safeAttributes: string[] = [];
  for (const match of tag.matchAll(HTML_ATTRIBUTE_PATTERN)) {
    const [, attributeName = '', attributeValue] = match;
    if (isSafeHtmlAttribute(attributeName, attributeValue)) {
      safeAttributes.push(attributeValue ? `${attributeName}=${attributeValue}` : attributeName);
    }
  }

  const closing = /\/\s*>$/.test(tag) ? ' /' : '';
  return `<${lowerTagName}${safeAttributes.length ? ` ${safeAttributes.join(' ')}` : ''}${closing}>`;
}

function sanitizeMarkdownChunk(value: string): string {
  // HTML is rebuilt from a tag/attribute allow-list so event handlers and dangerous protocols are removed globally.
  return value
    .replace(HTML_TAG_PATTERN, (tag, tagName: string) => sanitizeAllowedHtmlTag(tag, tagName))
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

