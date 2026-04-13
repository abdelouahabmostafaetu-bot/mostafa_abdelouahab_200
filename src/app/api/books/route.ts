import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminPasswordValid } from '@/features/library/lib/library-auth';
import { normalizeCategory } from '@/features/library/lib/library-categories';
import { connectToDatabase } from '@/features/library/lib/mongodb';
import BookModel from '@/features/library/models/book';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getPublicErrorDetails(error: unknown, fallbackMessage: string): {
  status: number;
  message: string;
} {
  const rawMessage = error instanceof Error ? error.message : '';
  const isMissingMongoUri = rawMessage.includes('MONGODB_URI is not configured');
  const isDatabaseConnectionIssue = /ENOTFOUND|ECONNREFUSED|MongoServerSelectionError|buffering timed out/i.test(
    rawMessage,
  );

  if (isMissingMongoUri) {
    return {
      status: 503,
      message: 'Server configuration is incomplete. MONGODB_URI is missing.',
    };
  }

  if (isDatabaseConnectionIssue) {
    return {
      status: 503,
      message: 'Database connection failed. Check MongoDB URI and Atlas network access.',
    };
  }

  return {
    status: 500,
    message: fallbackMessage,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
    const category = request.nextUrl.searchParams.get('category')?.trim() ?? '';

    const query: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ title: regex }, { author: regex }, { category: regex }];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    const docs = await BookModel.find(query).sort({ addedAt: -1, _id: -1 });
    const books = docs.map((doc) => doc.toJSON());

    return NextResponse.json(books, { status: 200 });
  } catch (error) {
    console.error('GET /api/books failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Failed to load books.');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data.' },
        { status: 415 },
      );
    }

    const formData = await request.formData();
    const password = String(formData.get('password') ?? '');

    if (!isAdminPasswordValid(password)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const title = String(formData.get('title') ?? '').trim();
    const author = String(formData.get('author') ?? '').trim();
    const categoryInput = String(formData.get('category') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const coverUrl = String(formData.get('coverUrl') ?? '').trim();

    if (!title || !author || !categoryInput) {
      return NextResponse.json(
        { error: 'Title, author, and category are required.' },
        { status: 400 },
      );
    }

    const category = normalizeCategory(categoryInput);

    let fileName = '';
    let fileSize = 0;
    let filePath = '';

    const fileValue = formData.get('file');
    if (fileValue instanceof File && fileValue.size > 0) {
      const loweredName = fileValue.name.toLowerCase();
      const isPdf = loweredName.endsWith('.pdf');
      const isEpub = loweredName.endsWith('.epub');

      if (!isPdf && !isEpub) {
        return NextResponse.json(
          { error: 'Only PDF and EPUB files are allowed.' },
          { status: 400 },
        );
      }

      const blob = await put(
        `library/${Date.now()}-${sanitizeFileName(fileValue.name || 'book-file')}`,
        fileValue,
        {
          access: 'public',
          addRandomSuffix: true,
        },
      );

      filePath = blob.url;
      fileName = fileValue.name;
      fileSize = fileValue.size;
    }

    const book = await BookModel.create({
      title,
      author,
      category,
      description,
      coverUrl,
      fileName,
      fileSize,
      filePath,
      addedAt: new Date().toISOString(),
    });

    return NextResponse.json(book.toJSON(), { status: 201 });
  } catch (error) {
    console.error('POST /api/books failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Failed to add book.');
    return NextResponse.json({ error: message }, { status });
  }
}
