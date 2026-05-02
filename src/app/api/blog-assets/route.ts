import { put } from '@vercel/blob';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

function sanitizeFileName(value: string): string {
  const parsed = path.parse(value || 'blog-image');
  const safeName = (parsed.name || 'blog-image')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
  return `${safeName || 'blog-image'}${parsed.ext.toLowerCase()}`;
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'blog-assets-post', 20);
  if (limited) return limited;

  await requireAdmin();

  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data.' },
        { status: 415 },
      );
    }

    const formData = await request.formData();

    const fileValue = formData.get('file');
    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return NextResponse.json({ error: 'Choose an image first.' }, { status: 400 });
    }

    const extension = path.extname(fileValue.name || '').toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(fileValue.type) || !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: 'Only PNG, JPG, and JPEG images are allowed.' },
        { status: 400 },
      );
    }

    if (fileValue.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Images must be smaller than 4 MB.' },
        { status: 400 },
      );
    }

    const blob = await put(`blog-images/${Date.now()}-${sanitizeFileName(fileValue.name)}`, fileValue, {
      access: 'public',
      addRandomSuffix: true,
    });
    return NextResponse.json(
      {
        url: blob.url,
        pathname: blob.pathname,
        markdown: `![Blog image](${blob.url})`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/blog-assets failed:', error);
    return NextResponse.json(
      { error: 'Failed to upload image to Vercel Blob.' },
      { status: 500 },
    );
  }
}
