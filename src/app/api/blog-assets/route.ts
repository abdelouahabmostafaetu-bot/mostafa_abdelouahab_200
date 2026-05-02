import { put } from '@vercel/blob';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const LOCAL_BLOG_UPLOAD_PREFIX = '/uploads/blog/';
const LOCAL_BLOG_UPLOAD_DIRECTORY = path.join(process.cwd(), 'public', 'uploads', 'blog');
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.heic',
  '.heif',
]);
const IMAGE_TYPE_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/heic': '.heic',
  'image/heif': '.heif',
};
const EXTENSION_IMAGE_TYPE: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

function getImageExtension(file: File): string {
  const fileExtension = path.extname(file.name || '').toLowerCase();
  return fileExtension || IMAGE_TYPE_EXTENSION[file.type] || '';
}

function getImageBaseName(file: File, extension: string): string {
  const baseName = path.basename(file.name || 'blog-image', extension);
  return baseName && baseName !== '.' ? baseName : 'blog-image';
}

async function saveLocalBlogImage(file: File): Promise<string> {
  const extension = getImageExtension(file);
  const baseName = getImageBaseName(file, extension);
  const storedName = `${sanitizeFileName(baseName)}-${randomUUID()}${extension}`;
  const absolutePath = path.join(LOCAL_BLOG_UPLOAD_DIRECTORY, storedName);

  await mkdir(LOCAL_BLOG_UPLOAD_DIRECTORY, { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return `${LOCAL_BLOG_UPLOAD_PREFIX}${storedName}`;
}

async function fileToDataUrl(file: File, extension: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaType = file.type.startsWith('image/')
    ? file.type
    : EXTENSION_IMAGE_TYPE[extension] ?? 'image/*';
  return `data:${mediaType};base64,${buffer.toString('base64')}`;
}

async function saveBlogImage(file: File, extension: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const baseName = getImageBaseName(file, extension);
      const blob = await put(
        `blog/${Date.now()}-${sanitizeFileName(baseName)}${extension}`,
        file,
        {
          access: 'public',
          addRandomSuffix: true,
        },
      );
      return blob.url;
    } catch (error) {
      console.error('Vercel Blob blog image upload failed:', error);
    }
  }

  if (!process.env.VERCEL) {
    try {
      return await saveLocalBlogImage(file);
    } catch (error) {
      console.error('Local blog image upload failed:', error);
    }
  }

  return fileToDataUrl(file, extension);
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

    const extension = getImageExtension(fileValue);
    const hasValidImageExtension = ALLOWED_IMAGE_EXTENSIONS.has(extension);
    const hasValidImageType =
      fileValue.type === '' ||
      fileValue.type === 'application/octet-stream' ||
      fileValue.type.startsWith('image/');

    if (!hasValidImageExtension || !hasValidImageType) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, WEBP, GIF, SVG, HEIC, or HEIF images are allowed.' },
        { status: 400 },
      );
    }

    if (fileValue.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Images must be smaller than 8 MB.' },
        { status: 400 },
      );
    }

    const url = await saveBlogImage(fileValue, extension);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error('POST /api/blog-assets failed:', error);
    return NextResponse.json(
      { error: 'Failed to upload image. Try a smaller JPG, PNG, WEBP, HEIC, or HEIF image.' },
      { status: 500 },
    );
  }
}
