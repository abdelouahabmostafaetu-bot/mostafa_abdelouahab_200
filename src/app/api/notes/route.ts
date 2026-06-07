import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Note } from '@/lib/models/note';
import { requireAdminApi } from '@/lib/security';
import { checkRateLimit } from '@/lib/admin';
import { slugify } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '50', 10));
    const published = searchParams.get('published') === 'true';
    const favorite = searchParams.get('favorite') === 'true';
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    await connectDB();

    let query: any = { published };
    if (favorite) query.isFavorite = true;
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const total = await Note.countDocuments(query);
    const notes = await Note.find(query)
      .sort({ isFavorite: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedNotes = notes.map((note) => ({
      ...note,
      id: note._id,
      _id: undefined,
      __v: undefined,
    }));

    return NextResponse.json(
      {
        success: true,
        data: formattedNotes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit(request)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429 }
      );
    }

    await requireAdminApi(request);
    await connectDB();

    const body = await request.json();
    const { title, content, category, tags, difficulty, isFavorite, preview, references } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const slug = slugify(title);

    // Check if slug already exists
    const existing = await Note.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A note with this title already exists' },
        { status: 400 }
      );
    }

    const note = new Note({
      title: title.trim(),
      slug,
      content: content.trim(),
      category: category || 'note',
      tags: Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string').map((t: string) => t.trim()) : [],
      difficulty: difficulty || 'intermediate',
      isFavorite: Boolean(isFavorite),
      preview: preview?.trim() || content.substring(0, 300).trim(),
      references: Array.isArray(references) ? references.filter((r: any) => typeof r === 'string') : [],
      published: true,
    });

    await note.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          ...note.toObject(),
          id: note._id,
          _id: undefined,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to create note',
      },
      { status: 500 }
    );
  }
}
