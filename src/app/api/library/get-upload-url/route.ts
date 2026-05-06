import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit, createSafeBlobPath } from '@/lib/security';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'library-get-upload-url-post', 20);
  if (limited) return limited;

  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  try {
    const body = (await request.json()) as HandleUploadBody;
    
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 31457280, // Allow up to 30 MB
          validUntil: Date.now() + 1000 * 60 * 5, // 5 mins
          pathname: createSafeBlobPath('library/books', 'application/pdf'),
        };
      },
      onUploadCompleted: async () => {
        // Blob saved. Database save handles record creation.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('GET /api/library/get-upload-url failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes('Token')
            ? 'File storage is not configured properly.'
            : 'Failed to get upload URL.',
      },
      { status: 500 },
    );
  }
}
