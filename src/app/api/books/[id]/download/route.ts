import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BookModel from '@/lib/models/book';

type RouteContext = {
  params: {
    id: string;
  };
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: RouteContext) {
  try {
    await connectToDatabase();

    const book = await BookModel.findById(context.params.id);

    if (!book?.filePath) {
      return NextResponse.json({ error: 'Download file not found.' }, { status: 404 });
    }

    return NextResponse.redirect(book.filePath, { status: 302 });
  } catch (error) {
    console.error('GET /api/books/[id]/download failed:', error);
    return NextResponse.json({ error: 'Failed to download book.' }, { status: 500 });
  }
}
