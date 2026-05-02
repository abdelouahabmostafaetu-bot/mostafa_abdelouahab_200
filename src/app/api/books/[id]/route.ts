import { del } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { deleteStoredLibraryFile, isVercelBlobUrl } from '@/lib/library-files';
import { connectToDatabase } from '@/lib/mongodb';
import BookModel from '@/lib/models/book';
import { checkRateLimit } from '@/lib/security';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, context: RouteContext) {
  const limited = checkRateLimit(request, 'books-delete', 30);
  if (limited) return limited;

  await requireAdmin();

  try {
    await connectToDatabase();

    const { id } = await context.params;
    const book = await BookModel.findById(id);
    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }

    const storedFilePath = book.filePath;

    await book.deleteOne();

    if (storedFilePath && isVercelBlobUrl(storedFilePath)) {
      try {
        await del(storedFilePath);
      } catch (blobError) {
        console.error('Blob delete failed:', blobError);
      }
    } else if (storedFilePath) {
      try {
        await deleteStoredLibraryFile(storedFilePath);
      } catch (fileError) {
        console.error('Local file delete failed:', fileError);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/books/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete book.' }, { status: 500 });
  }
}
