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

    const pages = await NotebookPageModel.find({ notebookSlug: slug })
      .sort({ pageNumber: 1 })
      .lean();

    const data = pages.map((p) => ({
      ...p,
      id: String(p._id),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch pages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const { slug } = await params;
    await connectToDatabase();

    // Check notebook exists
    const notebook = await NotebookModel.findOne({ slug });
    if (!notebook) {
      return NextResponse.json({ success: false, error: 'Notebook not found' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { title, content, pageNumber } = body;

    // Auto-assign next page number if not provided
    let pageNum = typeof pageNumber === 'number' ? pageNumber : null;
    if (!pageNum) {
      const lastPage = await NotebookPageModel.findOne({ notebookSlug: slug })
        .sort({ pageNumber: -1 })
        .lean();
      pageNum = lastPage ? lastPage.pageNumber + 1 : 1;
    }

    // Check if page number already exists
    const existing = await NotebookPageModel.findOne({ notebookSlug: slug, pageNumber: pageNum });
    if (existing) {
      return NextResponse.json({ success: false, error: `Page ${pageNum} already exists` }, { status: 400 });
    }

    const page = await NotebookPageModel.create({
      notebookSlug: slug,
      pageNumber: pageNum,
      title: String(title ?? '').trim(),
      content: String(content ?? ''),
    });

    return NextResponse.json({ success: true, data: page.toJSON() }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create page';
    console.error('Notebook page POST error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
