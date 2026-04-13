import { NextResponse } from 'next/server';
import { PRESET_CATEGORIES } from '@/lib/library-categories';
import { connectToDatabase } from '@/lib/mongodb';
import BookModel from '@/lib/models/book';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    const dbCategories = await BookModel.distinct('category');
    const merged = Array.from(
      new Set([
        ...PRESET_CATEGORIES,
        ...dbCategories.map((value) => String(value).trim()).filter(Boolean),
      ]),
    );

    return NextResponse.json(merged, { status: 200 });
  } catch (error) {
    console.error('GET /api/categories failed:', error);
    return NextResponse.json({ error: 'Failed to load categories.' }, { status: 500 });
  }
}
