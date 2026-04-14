import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BlogPostModel from '@/lib/models/blog-post';
import {
  buildExcerpt,
  extractBlobUrlsFromText,
  normalizeBlogSlug,
  normalizeTags,
} from '@/lib/content';
import { isAdminPasswordValid } from '@/lib/library-admin';

type RouteContext = {
  params: {
    id: string;
  };
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function looksLikeBlobUrl(value: string): boolean {
  return (
    value.includes('blob.vercel-storage.com') || value.includes('.public.blob.vercel-storage.com')
  );
}

async function deleteBlobUrls(urls: string[]) {
  for (const url of urls) {
    try {
      await del(url);
    } catch (error) {
      console.error('Blob delete failed:', error);
    }
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
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

    await connectToDatabase();

    const post = await BlogPostModel.findById(context.params.id);
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
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

    const existing = await BlogPostModel.findOne({
      slug,
      _id: { $ne: context.params.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Another post already uses this slug. Change the slug and try again.' },
        { status: 409 },
      );
    }

    post.title = title;
    post.slug = slug;
    post.excerpt = buildExcerpt(content, excerpt);
    post.category = category;
    post.tags = tags;
    post.coverImageUrl = coverImageUrl;
    post.content = content;
    post.isPublished = isPublished;
    post.updatedAt = new Date().toISOString();

    if (isPublished && !post.publishedAt) {
      post.publishedAt = post.updatedAt;
    }

    if (!isPublished) {
      post.publishedAt = '';
    }

    await post.save();

    return NextResponse.json(post.toJSON(), { status: 200 });
  } catch (error) {
    console.error('PUT /api/blog-posts/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update post.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      password?: string;
    };

    if (!isAdminPasswordValid(body.password)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    const post = await BlogPostModel.findById(context.params.id);
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    const blobUrls = [
      ...(looksLikeBlobUrl(post.coverImageUrl) ? [post.coverImageUrl] : []),
      ...extractBlobUrlsFromText(post.content),
    ];

    await post.deleteOne();
    await deleteBlobUrls(blobUrls);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/blog-posts/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete post.' }, { status: 500 });
  }
}
