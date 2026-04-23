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
    console.warn('GET /api/books/stats using empty stats:', error);
    return NextResponse.json(
      {
        totalBooks: 0,
        categoriesCount: 0,
      },
      { status: 200 },
    );
  }
}
