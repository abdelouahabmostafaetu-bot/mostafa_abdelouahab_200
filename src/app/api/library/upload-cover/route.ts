import { put } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';
import {
  sanitizeUploadFileName,
  validateCoverUploadFile,
} from '@/lib/library-uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'library-upload-cover-post', 20);
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
      return NextResponse.json({ error: 'Choose a cover image first.' }, { status: 400 });
    }

    const validationError = validateCoverUploadFile(fileValue);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const filename = sanitizeUploadFileName(fileValue.name, 'cover.jpg');
    const blob = await put(`library/covers/${Date.now()}-${filename}`, fileValue, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json(
      {
        url: blob.url,
        pathname: blob.pathname,
        filename,
        size: fileValue.size,
        contentType: fileValue.type,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to upload cover image to Vercel Blob.' },
      { status: 500 },
    );
  }
}
