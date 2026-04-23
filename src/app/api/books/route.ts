import { put } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { isAdminPasswordValid } from '@/lib/library-admin';
import { normalizeCategory } from '@/lib/library-categories';
import {
  getFileNameFromUrl,
  normalizeFileUrl,
  saveLocalLibraryFile,
  validateLibraryFile,
} from '@/lib/library-files';
import { connectToDatabase } from '@/lib/mongodb';
import BookModel from '@/lib/models/book';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getBoundedPositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function mapBook(payload: Record<string, unknown>) {
  return {
    id: String(payload._id ?? payload.id ?? ''),
    title: String(payload.title ?? ''),
    author: String(payload.author ?? ''),
    category: String(payload.category ?? ''),
    description: String(payload.description ?? ''),
    coverUrl: String(payload.coverUrl ?? ''),
    fileName: String(payload.fileName ?? ''),
    fileSize: Number(payload.fileSize ?? 0),
    filePath: String(payload.filePath ?? ''),
    addedAt: String(payload.addedAt ?? ''),
  };
}

function getPublicErrorDetails(error: unknown, fallbackMessage: string): {
  status: number;
  message: string;
} {
  const rawMessage = error instanceof Error ? error.message : '';
  const isMissingMongoUri = rawMessage.includes('MONGODB_URI is not configured');
  const isMissingBlobToken = rawMessage.includes('BLOB_READ_WRITE_TOKEN');
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
    message: isMissingBlobToken
      ? 'File storage is not configured correctly.'
      : fallbackMessage,
  };
}

export async function GET(request: NextRequest) {
  const page = getBoundedPositiveInt(request.nextUrl.searchParams.get('page'), 1, 10_000);
  const pageSize = getBoundedPositiveInt(
    request.nextUrl.searchParams.get('pageSize') ?? request.nextUrl.searchParams.get('limit'),
    20,
    50,
  );

  try {
    await connectToDatabase();

    const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
    const category = request.nextUrl.searchParams.get('category')?.trim() ?? '';

    const query: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { title: regex },
        { author: regex },
        { category: regex },
        { description: regex },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    const [docs, total] = await Promise.all([
      BookModel.find(query)
        .sort({ addedAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      BookModel.countDocuments(query),
    ]);
    const books = docs.map((doc) => mapBook(doc as Record<string, unknown>));

    return NextResponse.json(
      {
        books,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /api/books failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Failed to load books.');
    if (status === 503) {
      return NextResponse.json(
        {
          books: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 1,
          },
          warning: message,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = checkRateLimit(request, 'books-post', 20);
    if (limited) return limited;

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
    const fileUrlInput = String(
      formData.get('fileUrl') ?? formData.get('downloadUrl') ?? '',
    ).trim();

    if (!title || !author || !categoryInput) {
      return NextResponse.json(
        { error: 'Title, author, and category are required.' },
        { status: 400 },
      );
    }

    const category = normalizeCategory(categoryInput);
    let fileUrl = '';

    try {
      fileUrl = normalizeFileUrl(fileUrlInput);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Download link is invalid.' },
        { status: 400 },
      );
    }

    let fileName = '';
    let fileSize = 0;
    let filePath = '';

    const fileValue = formData.get('file');
    if (fileValue instanceof File && fileValue.size > 0) {
      const fileError = validateLibraryFile(fileValue);
      if (fileError) {
        return NextResponse.json(
          { error: fileError },
          { status: 400 },
        );
      }

      if (process.env.BLOB_READ_WRITE_TOKEN) {
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
      } else {
        const storedFile = await saveLocalLibraryFile(fileValue);
        filePath = storedFile.filePath;
        fileName = storedFile.fileName;
        fileSize = storedFile.fileSize;
      }
    } else if (fileUrl) {
      filePath = fileUrl;
      fileName = getFileNameFromUrl(fileUrl);
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
