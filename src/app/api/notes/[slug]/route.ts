import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Note } from '@/lib/models/note';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';
import { slugify } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    const note = await Note.findOne({ slug: slug, published: true }).lean();

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...note,
          id: note._id,
          _id: undefined,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const rateLimitResponse = checkRateLimit(request, 'notes:update', 10);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const adminResponse = await requireAdminApi();
    if (adminResponse) {
      return adminResponse;
    }
    await connectToDatabase();

    const body = await request.json();
    const { title, content, category, tags, difficulty, isFavorite, preview, references } = body;

    const note = await Note.findOne({ slug: slug });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Update fields
    if (title?.trim()) {
      note.title = title.trim();
      const newSlug = slugify(title);
      if (newSlug !== note.slug) {
        const existing = await Note.findOne({ slug: newSlug });
        if (existing && existing._id.toString() !== note._id.toString()) {
          return NextResponse.json(
            { success: false, error: 'A note with this title already exists' },
            { status: 400 }
          );
        }
        note.slug = newSlug;
      }
    }

    if (content?.trim()) note.content = content.trim();
    if (category) note.category = category;
    if (Array.isArray(tags)) note.tags = tags.filter((t: any) => typeof t === 'string').map((t: string) => t.trim());
    if (difficulty) note.difficulty = difficulty;
    if (typeof isFavorite === 'boolean') note.isFavorite = isFavorite;
    if (preview?.trim()) note.preview = preview.trim();
    if (Array.isArray(references)) note.references = references.filter((r: any) => typeof r === 'string');

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
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update note',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const rateLimitResponse = checkRateLimit(request, 'notes:delete', 10);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const adminResponse = await requireAdminApi();
    if (adminResponse) {
      return adminResponse;
    }
    await connectToDatabase();

    const result = await Note.deleteOne({ slug: slug });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: 'Note deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
