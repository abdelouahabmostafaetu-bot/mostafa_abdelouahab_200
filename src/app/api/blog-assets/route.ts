import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminPasswordValid } from '@/lib/library-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: NextRequest) {
  try {
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

    if (!fileValue.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 });
    }

    if (fileValue.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Images must be smaller than 8 MB.' },
        { status: 400 },
      );
    }

    const blob = await put(
      `blog/${Date.now()}-${sanitizeFileName(fileValue.name || 'blog-image')}`,
      fileValue,
      {
        access: 'public',
        addRandomSuffix: true,
      },
    );

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (error) {
    console.error('POST /api/blog-assets failed:', error);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}
