import { del, put } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { normalizeCategory } from '@/lib/library-categories';
import {
  deleteStoredLibraryFile,
  getFileNameFromUrl,
  isVercelBlobUrl,
  normalizeFileUrl,
} from '@/lib/library-files';
import {
  sanitizeUploadFileName,
  validateBookUploadFile,
} from '@/lib/library-uploads';
import { connectToDatabase } from '@/lib/mongodb';
import BookModel from '@/lib/models/book';
import { checkRateLimit } from '@/lib/security';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mapBook(payload: Record<string, unknown>) {
  const pdfUrl = String(
    payload.pdfUrl ??
      payload.fileUrl ??
      payload.pdf_url ??
      payload.downloadUrl ??
      payload.filePath ??
      '',
  );
  const fileUrl = String(payload.fileUrl ?? payload.pdfUrl ?? payload.filePath ?? '');
  const createdAt =
    payload.createdAt instanceof Date
      ? payload.createdAt.toISOString()
      : String(payload.addedAt ?? '');
  const updatedAt =
    payload.updatedAt instanceof Date ? payload.updatedAt.toISOString() : createdAt;

  return {
    id: String(payload._id ?? payload.id ?? ''),
    title: String(payload.title ?? ''),
    slug: String(payload.slug ?? ''),
    author: String(payload.author ?? ''),
    category: String(payload.category ?? ''),
    description: String(payload.description ?? ''),
    tags: Array.isArray(payload.tags) ? payload.tags.map(String).filter(Boolean) : [],
    coverUrl: String(
      payload.coverUrl ??
        payload.imageUrl ??
        payload.cover_url ??
        payload.thumbnailUrl ??
        payload.cover ??
        '',
    ),
    coverPathname: String(payload.coverPathname ?? ''),
    pdfUrl,
    fileUrl,
    filePathname: String(payload.filePathname ?? ''),
    fileName: String(payload.fileName ?? ''),
    fileSize: Number(payload.fileSize ?? 0),
    fileType: String(payload.fileType ?? ''),
    filePath: fileUrl,
    hasFile: Boolean(pdfUrl || fileUrl),
    addedAt: String(payload.addedAt ?? createdAt),
    createdAt,
    updatedAt,
  };
}

function parseTags(value: FormDataEntryValue | null): string[] | undefined {
  if (value === null) return undefined;
  const seen = new Set<string>();

  return String(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const limited = checkRateLimit(request, 'books-get-one', 60);
  if (limited) return limited;

  await requireAdmin();

  try {
    await connectToDatabase();

    const { id } = await context.params;
    const book = await BookModel.findById(id).lean();
    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }
    return NextResponse.json(mapBook(book as Record<string, unknown>), { status: 200 });
  } catch (error) {
    console.error('GET /api/books/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to load book.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const limited = checkRateLimit(request, 'books-put', 30);
  if (limited) return limited;

  await requireAdmin();

  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data.' },
        { status: 415 },
      );
    }

    await connectToDatabase();

    const { id } = await context.params;
    const book = await BookModel.findById(id);
    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }
    if (!book.slug) {
      book.slug = String(book._id);
    }

    const formData = await request.formData();
    const previousCoverUrl = book.coverUrl || '';
    const previousCoverPathname = book.coverPathname || '';
    const title = String(formData.get('title') ?? '').trim();
    const author = String(formData.get('author') ?? '').trim();
    const categoryInput = String(formData.get('category') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const coverUrl = String(formData.get('coverUrl') ?? '').trim();
    const coverPathname = String(formData.get('coverPathname') ?? '').trim();
    const tags = parseTags(formData.get('tags'));

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    book.title = title;
    book.author = author;
    if (categoryInput) book.category = normalizeCategory(categoryInput);
    book.description = description;
    book.coverUrl = coverUrl;
    book.coverPathname =
      coverPathname || (coverUrl && coverUrl === previousCoverUrl ? previousCoverPathname : '');
    if (tags) book.tags = tags;

    const fileValue = formData.get('file');
    if (fileValue instanceof File && fileValue.size > 0) {
      const fileError = validateBookUploadFile(fileValue);
      if (fileError) {
        return NextResponse.json({ error: fileError }, { status: 400 });
      }

      const filename = sanitizeUploadFileName(fileValue.name, 'book.pdf');
      const blob = await put(`library/books/${Date.now()}-${filename}`, fileValue, {
        access: 'public',
        addRandomSuffix: true,
      });

      book.fileUrl = blob.url;
      book.pdfUrl = blob.url;
      book.filePathname = blob.pathname;
      book.fileName = filename;
      book.fileSize = fileValue.size;
      book.fileType = fileValue.type;
      book.filePath = blob.url;
    } else {
      const fileUrlInput = String(
        formData.get('fileUrl') ?? formData.get('downloadUrl') ?? '',
      ).trim();

      if (fileUrlInput) {
        let fileUrl = '';
        try {
          fileUrl = normalizeFileUrl(fileUrlInput);
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Download link is invalid.' },
            { status: 400 },
          );
        }

        book.fileUrl = fileUrl;
        book.pdfUrl = fileUrl;
        book.filePathname = '';
        book.fileName = getFileNameFromUrl(fileUrl);
        book.filePath = fileUrl;
      }
    }

    await book.save();

    return NextResponse.json(mapBook(book.toJSON()), { status: 200 });
  } catch (error) {
    console.error('PUT /api/books/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update book.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const limited = checkRateLimit(request, 'books-delete', 30);
  if (limited) return limited;

  await requireAdmin();

  try {
    await connectToDatabase();

    const { id } = await context.params;
    const book = await BookModel.findById(id);
    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }

    const storedFilePath = book.fileUrl || book.filePath || '';
    const storedCoverPath = book.coverUrl || '';

    await book.deleteOne();

    if (storedFilePath && isVercelBlobUrl(storedFilePath)) {
      try {
        await del(storedFilePath);
      } catch (blobError) {
        console.error('Blob delete failed:', blobError);
      }
    } else if (storedFilePath) {
      try {
        await deleteStoredLibraryFile(storedFilePath);
      } catch (fileError) {
        console.error('Local file delete failed:', fileError);
      }
    }

    if (storedCoverPath && isVercelBlobUrl(storedCoverPath)) {
      try {
        await del(storedCoverPath);
      } catch (blobError) {
        console.error('Cover Blob delete failed:', blobError);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/books/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete book.' }, { status: 500 });
  }
}
