import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BlogPostModel from '@/lib/models/blog-post';
import {
  buildExcerpt,
  normalizeBlogSlug,
  normalizeTags,
} from '@/lib/content';
import { isAdminPasswordValid } from '@/lib/library-admin';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPublicErrorDetails(error: unknown, fallbackMessage: string): {
  status: number;
  message: string;
} {
  const rawMessage = error instanceof Error ? error.message : '';
  const isMissingMongoUri = rawMessage.includes('MONGODB_URI is not configured');
  const isDatabaseConnectionIssue =
    /ENOTFOUND|ECONNREFUSED|MongoServerSelectionError|buffering timed out/i.test(rawMessage);

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
  const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
  const adminMode = request.nextUrl.searchParams.get('admin') === '1';
  const password = request.headers.get('x-admin-password');

  if (adminMode && !isAdminPasswordValid(password)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const query: Record<string, unknown> = adminMode ? {} : { isPublished: true };

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { title: regex },
        { slug: regex },
        { category: regex },
        { tags: regex },
      ];
    }

    const docs = await BlogPostModel.find(query).sort({ publishedAt: -1, createdAt: -1, _id: -1 });
    return NextResponse.json(docs.map((doc) => doc.toJSON()), { status: 200 });
  } catch (error) {
    console.error('GET /api/blog-posts failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Failed to load posts.');
    if (status === 503) {
      return NextResponse.json([], {
        status: 200,
        headers: {
          'x-warning': message,
        },
      });
    }

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = checkRateLimit(request, 'blog-posts-post', 20);
    if (limited) return limited;

    await connectToDatabase();

    const body = (await request.json().catch(() => null)) as
      | {
          password?: string;
          title?: string;
          slug?: string;
          excerpt?: string;
          category?: string;
          tags?: string[] | string;
          coverImageUrl?: string;
          content?: string;
          isPublished?: boolean;
        }
      | null;

    if (!isAdminPasswordValid(body?.password)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const title = String(body?.title ?? '').trim();
    const content = String(body?.content ?? '').trim();
    const category = String(body?.category ?? '').trim() || 'Mathematics';
    const excerpt = String(body?.excerpt ?? '').trim();
    const coverImageUrl = String(body?.coverImageUrl ?? '').trim();
    const isPublished = Boolean(body?.isPublished);
    const tags = normalizeTags(body?.tags ?? []);
    const slug = normalizeBlogSlug(title, String(body?.slug ?? '').trim());

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required.' },
        { status: 400 },
      );
    }

    const existing = await BlogPostModel.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { error: 'Another post already uses this slug. Change the slug and try again.' },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();

    const post = await BlogPostModel.create({
      title,
      slug,
      excerpt: buildExcerpt(content, excerpt),
      category,
      tags,
      coverImageUrl,
      content,
      isPublished,
      createdAt: now,
      updatedAt: now,
      publishedAt: isPublished ? now : '',
    });

    return NextResponse.json(post.toJSON(), { status: 201 });
  } catch (error) {
    console.error('POST /api/blog-posts failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Failed to save post.');
    return NextResponse.json({ error: message }, { status });
  }
}
