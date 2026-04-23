import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BookModel from '@/lib/models/book';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: RouteContext) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    const book = await BookModel.findById(id);

    if (!book?.filePath) {
      return NextResponse.json({ error: 'Download file not found.' }, { status: 404 });
    }

    return NextResponse.redirect(new URL(book.filePath, request.url), { status: 302 });
  } catch (error) {
    console.error('GET /api/books/[id]/download failed:', error);
    return NextResponse.json({ error: 'Failed to download book.' }, { status: 500 });
  }
}
