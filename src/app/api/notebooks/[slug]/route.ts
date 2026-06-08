import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { NotebookModel } from '@/lib/models/notebook';
import { NotebookPageModel } from '@/lib/models/notebook-page';
import { requireAdminApi } from '@/lib/admin';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    const notebook = await NotebookModel.findOne({ slug, isPublished: true }).lean();
    if (!notebook) {
      return NextResponse.json({ success: false, error: 'Notebook not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...notebook, id: String(notebook._id), _id: undefined },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch notebook' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const { slug } = await params;
    await connectToDatabase();

    const notebook = await NotebookModel.findOne({ slug });
    if (!notebook) {
      return NextResponse.json({ success: false, error: 'Notebook not found' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.title === 'string' && body.title.trim()) notebook.title = body.title.trim();
    if (typeof body.subject === 'string' && body.subject.trim()) notebook.subject = body.subject.trim();
    if (typeof body.description === 'string') notebook.description = body.description.trim();
    if (typeof body.color === 'string' && body.color) notebook.color = body.color;

    await notebook.save();
    return NextResponse.json({ success: true, data: notebook.toJSON() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update notebook';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const { slug } = await params;
    await connectToDatabase();

    const result = await NotebookModel.deleteOne({ slug });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Notebook not found' }, { status: 404 });
    }

    // Delete all pages
    await NotebookPageModel.deleteMany({ notebookSlug: slug });

    return NextResponse.json({ success: true, message: 'Notebook deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete notebook' }, { status: 500 });
  }
}
