import { put } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminUser, requireAdmin } from '@/lib/admin';
import { normalizeCategory } from '@/lib/library-categories';
import { normalizeFileUrl } from '@/lib/library-files';
import {
  sanitizeUploadFileName,
  validateBookUploadFile,
} from '@/lib/library-uploads';
import { connectToDatabase } from '@/lib/mongodb';
import BookModel from '@/lib/models/book';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UploadedBlobPayload = {
  url: string;
  pathname: string;
  filename: string;
  size: number;
  contentType: string;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBoundedPositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

  return slug || 'book';
}

async function createUniqueSlug(title: string): Promise<string> {
  const baseSlug = slugify(title);
  let candidate = baseSlug;
  let suffix = 2;

  while (await BookModel.exists({ slug: candidate })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function parseTags(value: unknown): string[] {
  const rawTags = Array.isArray(value) ? value : String(value ?? '').split(',');
  const seen = new Set<string>();

  return rawTags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function isUploadedBlobPayload(value: unknown): value is UploadedBlobPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<UploadedBlobPayload>;

  return (
    typeof payload.url === 'string' &&
    typeof payload.pathname === 'string' &&
    typeof payload.filename === 'string' &&
    typeof payload.size === 'number' &&
    typeof payload.contentType === 'string'
  );
}

function getDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value) return value;
  return '';
}

function mapBook(payload: Record<string, unknown>, includeRawFileUrl = false) {
  const id = String(payload._id ?? payload.id ?? '');
  const title = String(payload.title ?? '');
  const slug = String(payload.slug ?? '') || id;
  const fileUrl = String(payload.fileUrl ?? payload.filePath ?? '');
  const filePathname = String(payload.filePathname ?? '');
  const hasFile = Boolean(fileUrl);
  const createdAt = getDateString(payload.createdAt) || String(payload.addedAt ?? '');
  const updatedAt = getDateString(payload.updatedAt) || createdAt;

  return {
    id,
    title,
    slug,
    author: String(payload.author ?? ''),
    category: String(payload.category ?? ''),
    description: String(payload.description ?? ''),
    tags: Array.isArray(payload.tags) ? payload.tags.map(String).filter(Boolean) : [],
    coverUrl: String(payload.coverUrl ?? ''),
    coverPathname: String(payload.coverPathname ?? ''),
    fileUrl: includeRawFileUrl ? fileUrl : undefined,
    filePathname: includeRawFileUrl ? filePathname : '',
    fileName: String(payload.fileName ?? ''),
    fileSize: Number(payload.fileSize ?? 0),
    fileType: String(payload.fileType ?? ''),
    filePath: includeRawFileUrl ? fileUrl : hasFile ? `/api/library/books/${slug}/download` : '',
    hasFile,
    addedAt: String(payload.addedAt ?? createdAt),
    createdAt,
    updatedAt,
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

async function shouldIncludeRawFileUrl(request: NextRequest): Promise<boolean> {
  if (request.nextUrl.searchParams.get('admin') !== '1') return false;

  try {
    return Boolean(await getCurrentAdminUser());
  } catch {
    return false;
  }
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
    const includeRawFileUrl = await shouldIncludeRawFileUrl(request);

    const query: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { title: regex },
        { author: regex },
        { category: regex },
        { description: regex },
        { tags: regex },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    const [docs, total] = await Promise.all([
      BookModel.find(query)
        .sort({ createdAt: -1, addedAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      BookModel.countDocuments(query),
    ]);
    const books = docs.map((doc) => mapBook(doc as Record<string, unknown>, includeRawFileUrl));

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

async function readJsonBookPayload(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const title = String(body.title ?? '').trim();
  const author = String(body.author ?? '').trim();
  const category = normalizeCategory(String(body.category ?? '').trim());
  const description = String(body.description ?? '').trim();
  const tags = parseTags(body.tags);
  const file = body.file;
  const cover = body.cover;

  if (!title) {
    return { error: 'Title is required.' };
  }

  if (!isUploadedBlobPayload(file)) {
    return { error: 'Upload a PDF before saving the book.' };
  }

  if (file.contentType !== 'application/pdf') {
    return { error: 'Only PDF files are allowed.' };
  }

  if (cover !== undefined && cover !== null && !isUploadedBlobPayload(cover)) {
    return { error: 'Cover upload data is invalid.' };
  }

  const uploadedCover = isUploadedBlobPayload(cover) ? cover : null;

  return {
    data: {
      title,
      author,
      category,
      description,
      tags,
      fileUrl: file.url,
      filePathname: file.pathname,
      fileName: file.filename,
      fileSize: file.size,
      fileType: file.contentType,
      coverUrl: uploadedCover?.url ?? '',
      coverPathname: uploadedCover?.pathname ?? '',
    },
  };
}

async function readMultipartBookPayload(request: NextRequest) {
  const formData = await request.formData();
  const title = String(formData.get('title') ?? '').trim();
  const author = String(formData.get('author') ?? '').trim();
  const category = normalizeCategory(String(formData.get('category') ?? '').trim());
  const description = String(formData.get('description') ?? '').trim();
  const tags = parseTags(formData.get('tags'));
  const coverUrl = String(formData.get('coverUrl') ?? '').trim();
  const coverPathname = String(formData.get('coverPathname') ?? '').trim();
  const fileUrlInput = String(
    formData.get('fileUrl') ?? formData.get('downloadUrl') ?? '',
  ).trim();

  if (!title) {
    return { error: 'Title is required.' };
  }

  const fileValue = formData.get('file');
  if (fileValue instanceof File && fileValue.size > 0) {
    const fileError = validateBookUploadFile(fileValue);
    if (fileError) {
      return { error: fileError };
    }

    const filename = sanitizeUploadFileName(fileValue.name, 'book.pdf');
    const blob = await put(`library/books/${Date.now()}-${filename}`, fileValue, {
      access: 'public',
      addRandomSuffix: true,
    });

    return {
      data: {
        title,
        author,
        category,
        description,
        tags,
        fileUrl: blob.url,
        filePathname: blob.pathname,
        fileName: filename,
        fileSize: fileValue.size,
        fileType: fileValue.type,
        coverUrl,
        coverPathname,
      },
    };
  }

  let fileUrl = '';
  try {
    fileUrl = normalizeFileUrl(fileUrlInput);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Download link is invalid.',
    };
  }

  if (!fileUrl) {
    return { error: 'Upload a PDF before saving the book.' };
  }

  return {
    data: {
      title,
      author,
      category,
      description,
      tags,
      fileUrl,
      filePathname: '',
      fileName: '',
      fileSize: 0,
      fileType: '',
      coverUrl,
      coverPathname,
    },
  };
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'books-post', 20);
  if (limited) return limited;

  await requireAdmin();

  try {
    await connectToDatabase();

    const contentType = request.headers.get('content-type') ?? '';
    const parsed = contentType.includes('application/json')
      ? await readJsonBookPayload(request)
      : contentType.includes('multipart/form-data')
        ? await readMultipartBookPayload(request)
        : { error: 'Content type must be application/json or multipart/form-data.' };

    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const slug = await createUniqueSlug(parsed.data.title);
    const now = new Date();

    const book = await BookModel.create({
      ...parsed.data,
      slug,
      filePath: parsed.data.fileUrl,
      addedAt: now.toISOString(),
    });

    return NextResponse.json(mapBook(book.toJSON(), true), { status: 201 });
  } catch (error) {
    console.error('POST /api/books failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Failed to add book.');
    return NextResponse.json({ error: message }, { status });
  }
}
