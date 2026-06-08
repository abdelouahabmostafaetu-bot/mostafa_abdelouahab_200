import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { NotebookPageModel } from '@/lib/models/notebook-page';
import { requireAdminApi } from '@/lib/admin';

type Ctx = { params: Promise<{ slug: string; pageNumber: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug, pageNumber } = await params;
    const num = parseInt(pageNumber, 10);
    if (isNaN(num)) {
      return NextResponse.json({ success: false, error: 'Invalid page number' }, { status: 400 });
    }

    await connectToDatabase();
    const page = await NotebookPageModel.findOne({ notebookSlug: slug, pageNumber: num }).lean();

    if (!page) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...page, id: String(page._id), _id: undefined },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch page' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const { slug, pageNumber } = await params;
    const num = parseInt(pageNumber, 10);
    if (isNaN(num)) {
      return NextResponse.json({ success: false, error: 'Invalid page number' }, { status: 400 });
    }

    await connectToDatabase();
    const page = await NotebookPageModel.findOne({ notebookSlug: slug, pageNumber: num });

    if (!page) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.title === 'string') page.title = body.title.trim();
    if (typeof body.content === 'string') page.content = body.content;

    await page.save();
    return NextResponse.json({ success: true, data: page.toJSON() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update page';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const { slug, pageNumber } = await params;
    const num = parseInt(pageNumber, 10);
    if (isNaN(num)) {
      return NextResponse.json({ success: false, error: 'Invalid page number' }, { status: 400 });
    }

    await connectToDatabase();
    const result = await NotebookPageModel.deleteOne({ notebookSlug: slug, pageNumber: num });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Page deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete page' }, { status: 500 });
  }
}
