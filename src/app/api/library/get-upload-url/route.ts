import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'library-get-upload-url-post', 20);
  if (limited) return limited;

  await requireAdmin();

  try {
    const body = (await request.json()) as {
      filename?: string;
      filetype?: string;
    };
    const filename = String(body.filename ?? 'book').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filetype = String(body.filetype ?? 'application/pdf');

    const { BlobAccessError } = await import('@vercel/blob');
    const response = await fetch('https://blob.vercel-storage.com/api/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'resumable',
        pathname: `library/books/${Date.now()}-${filename}`,
        contentType: filetype,
        access: 'public',
        addRandomSuffix: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error?.error ?? `Blob API returned ${response.status}`);
    }

    const data = (await response.json()) as {
      uploadUrl?: string;
      url?: string;
      pathname?: string;
    };
    return NextResponse.json(
      {
        uploadUrl: data.uploadUrl,
        url: data.url,
        pathname: data.pathname,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /api/library/get-upload-url failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes('BLOB_READ_WRITE_TOKEN')
            ? 'File storage is not configured.'
            : 'Failed to get upload URL.',
      },
      { status: 500 },
    );
  }
}
