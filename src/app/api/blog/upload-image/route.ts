import { put } from '@vercel/blob';
import path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function sanitizeFileName(value: string): string {
  const parsed = path.parse(value || 'blog-image');
  const name = parsed.name || 'blog-image';
  const extension = parsed.ext.toLowerCase();
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return `${safeName || 'blog-image'}${extension}`;
}

function validateImageFile(file: File): string | null {
  const extension = path.extname(file.name || '').toLowerCase();

  if (!ALLOWED_IMAGE_TYPES.has(file.type) || !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return 'Only PNG, JPG, JPEG, and WEBP images are allowed.';
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return 'Images must be smaller than 4 MB.';
  }

  return null;
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'blog-upload-image-post', 20);
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

    const validationError = validateImageFile(fileValue);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const blob = await put(
      `blog-images/${Date.now()}-${sanitizeFileName(fileValue.name)}`,
      fileValue,
      {
        access: 'public',
        addRandomSuffix: true,
      },
    );

    return NextResponse.json(
      {
        url: blob.url,
        pathname: blob.pathname,
        markdown: `![Blog image](${blob.url})`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/blog/upload-image failed:', error);
    return NextResponse.json(
      { error: 'Failed to upload image to Vercel Blob.' },
      { status: 500 },
    );
  }
}
