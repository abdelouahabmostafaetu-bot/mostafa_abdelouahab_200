import { put } from '@vercel/blob';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit, createSafeBlobPath } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'blog-assets-post', 20);
  if (limited) return limited;

  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

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
        { error: 'Only PNG, JPG, JPEG, and WEBP images are allowed.' },
        { status: 400 },
      );
    }

    if (fileValue.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Images must be smaller than 4 MB.' },
        { status: 400 },
      );
    }

    const blob = await put(createSafeBlobPath('blog-images', fileValue.type), fileValue, {
      access: 'public',
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
