import { put } from '@vercel/blob';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminPasswordValid } from '@/lib/library-admin';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const LOCAL_BLOG_UPLOAD_PREFIX = '/uploads/blog/';
const LOCAL_BLOG_UPLOAD_DIRECTORY = path.join(process.cwd(), 'public', 'uploads', 'blog');
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

async function saveLocalBlogImage(file: File): Promise<string> {
  const originalName = file.name || 'blog-image';
  const extension = path.extname(originalName).toLowerCase() || '.img';
  const baseName = path.basename(originalName, extension) || 'blog-image';
  const storedName = `${sanitizeFileName(baseName)}-${randomUUID()}${extension}`;
  const absolutePath = path.join(LOCAL_BLOG_UPLOAD_DIRECTORY, storedName);

  await mkdir(LOCAL_BLOG_UPLOAD_DIRECTORY, { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return `${LOCAL_BLOG_UPLOAD_PREFIX}${storedName}`;
}

export async function POST(request: NextRequest) {
  try {
    const limited = checkRateLimit(request, 'blog-assets-post', 20);
    if (limited) return limited;

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data.' },
        { status: 415 },
      );
    }

    const formData = await request.formData();
    const password = String(formData.get('password') ?? '');

    if (!isAdminPasswordValid(password)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const fileValue = formData.get('file');
    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return NextResponse.json({ error: 'Choose an image first.' }, { status: 400 });
    }

    const extension = path.extname(fileValue.name || '').toLowerCase();
    if (!fileValue.type.startsWith('image/') || !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 });
    }

    if (fileValue.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Images must be smaller than 8 MB.' },
        { status: 400 },
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const url = await saveLocalBlogImage(fileValue);
      return NextResponse.json({ url }, { status: 201 });
    }

    const blob = await put(`blog/${Date.now()}-${sanitizeFileName(fileValue.name || 'blog-image')}`, fileValue, {
      access: 'public',
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (error) {
    console.error('POST /api/blog-assets failed:', error);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}
