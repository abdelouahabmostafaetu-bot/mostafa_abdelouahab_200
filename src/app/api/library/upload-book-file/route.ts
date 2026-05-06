import { put } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit, createSafeBlobPath } from '@/lib/security';
import {
  sanitizeUploadFileName,
  validateBookUploadFile,
} from '@/lib/library-uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'library-upload-book-file-post', 20);
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
      return NextResponse.json({ error: 'Choose a PDF file first.' }, { status: 400 });
    }

    const validationError = validateBookUploadFile(fileValue);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const filename = sanitizeUploadFileName(fileValue.name, 'book.pdf');
    const blob = await put(createSafeBlobPath('library/books', fileValue.type), fileValue, {
      access: 'public',
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
      { error: 'Failed to upload book file to Vercel Blob.' },
      { status: 500 },
    );
  }
}
