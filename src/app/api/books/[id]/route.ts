import { del } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { isAdminPasswordValid } from '@/lib/library-admin';
import { deleteStoredLibraryFile, isVercelBlobUrl } from '@/lib/library-files';
import { connectToDatabase } from '@/lib/mongodb';
import BookModel from '@/lib/models/book';

type RouteContext = {
  params: {
    id: string;
  };
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      password?: string;
    };

    if (!isAdminPasswordValid(body.password)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    const book = await BookModel.findById(context.params.id);
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
