import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BookModel from '@/lib/models/book';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    const totalBooks = await BookModel.countDocuments();
    const categories = await BookModel.distinct('category');

    return NextResponse.json(
      {
        totalBooks,
        categoriesCount: categories.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /api/books/stats failed:', error);
    return NextResponse.json({ error: 'Failed to load stats.' }, { status: 500 });
  }
}
