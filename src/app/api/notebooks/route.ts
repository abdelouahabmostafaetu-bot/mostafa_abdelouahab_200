import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { NotebookModel } from '@/lib/models/notebook';
import { NotebookPageModel } from '@/lib/models/notebook-page';
import { requireAdminApi } from '@/lib/admin';
import { slugify } from '@/lib/utils';

export async function GET() {
  try {
    await connectToDatabase();
    const notebooks = await NotebookModel.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .lean();

    const data = await Promise.all(
      notebooks.map(async (nb) => ({
        ...nb,
        id: String(nb._id),
        _id: undefined,
        pageCount: await NotebookPageModel.countDocuments({ notebookSlug: nb.slug }),
      })),
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Notebooks GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notebooks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    await connectToDatabase();
    const body = (await request.json()) as Record<string, unknown>;
    const { title, subject, description, color } = body;

    if (!String(title ?? '').trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const titleStr = String(title).trim();
    const slug = slugify(titleStr);

    const existing = await NotebookModel.findOne({ slug });
    if (existing) {
      return NextResponse.json({ success: false, error: 'A notebook with this title already exists' }, { status: 400 });
    }

    const notebook = await NotebookModel.create({
      title: titleStr,
      slug,
      subject: String(subject ?? 'Mathematics').trim() || 'Mathematics',
      description: String(description ?? '').trim(),
      color: String(color ?? '#194a50'),
      isPublished: true,
    });

    return NextResponse.json({ success: true, data: notebook.toJSON() }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create notebook';
    console.error('Notebook POST error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
