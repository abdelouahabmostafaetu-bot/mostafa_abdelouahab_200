import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'library-get-upload-url-post', 20);
  if (limited) return limited;

  await requireAdmin();

  try {
    const body = (await request.json()) as HandleUploadBody;
    
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const cleanName = pathname.replace(/[^a-zA-Z0-9.-_]/g, '_');
        return {
          allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
          maximumSizeInBytes: 31457280, // Allow up to 30 MB
          validUntil: Date.now() + 1000 * 60 * 5, // 5 mins
          addRandomSuffix: true,
          pathname: `library/books/${Date.now()}-${cleanName}`,
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
