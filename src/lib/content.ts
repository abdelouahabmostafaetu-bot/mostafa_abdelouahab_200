import { connectToDatabase } from '@/lib/mongodb';
import BlogPostModel from '@/lib/models/blog-post';
import type { BlogPost } from '@/types/blog';
import { calculateReadingTime, slugify } from '@/lib/utils';

type BlogQueryOptions = {
  includeDrafts?: boolean;
};

function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildExcerpt(content: string, providedExcerpt = ''): string {
  const explicitExcerpt = providedExcerpt.trim();
  if (explicitExcerpt) {
    return explicitExcerpt;
  }

  const plainText = stripMarkdown(content);
  if (plainText.length <= 180) {
    return plainText;
  }

  return `${plainText.slice(0, 177).trimEnd()}...`;
}

export function normalizeTags(rawTags: string[] | string): string[] {
  const values = Array.isArray(rawTags) ? rawTags : rawTags.split(',');

  return Array.from(
    new Set(
      values
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeBlogSlug(title: string, requestedSlug = ''): string {
  const safeSlug = slugify(requestedSlug || title);
  return safeSlug || `post-${Date.now()}`;
}

export function extractBlobUrlsFromText(content: string): string[] {
  const matches = content.match(/https:\/\/[^\s)"]+/g) ?? [];
  return Array.from(
    new Set(
      matches.filter(
        (url) =>
          url.includes('blob.vercel-storage.com') || url.includes('.public.blob.vercel-storage.com'),
      ),
    ),
  );
}

function mapToBlogPost(payload: Record<string, unknown>): BlogPost {
  return {
    id: String(payload.id ?? ''),
    title: String(payload.title ?? ''),
    slug: String(payload.slug ?? ''),
    excerpt: buildExcerpt(String(payload.content ?? ''), String(payload.excerpt ?? '')),
    category: String(payload.category ?? 'Mathematics'),
    tags: Array.isArray(payload.tags) ? (payload.tags as string[]) : [],
    coverImageUrl: String(payload.coverImageUrl ?? ''),
    content: String(payload.content ?? ''),
    isPublished: Boolean(payload.isPublished),
    createdAt: String(payload.createdAt ?? ''),
    updatedAt: String(payload.updatedAt ?? ''),
    publishedAt: String(payload.publishedAt ?? ''),
    readingTime: calculateReadingTime(String(payload.content ?? '')),
  };
}

export async function getBlogPosts(options: BlogQueryOptions = {}): Promise<BlogPost[]> {
  await connectToDatabase();

  const query = options.includeDrafts ? {} : { isPublished: true };
  const docs = await BlogPostModel.find(query).sort({ publishedAt: -1, createdAt: -1, _id: -1 });

  return docs.map((doc) => mapToBlogPost(doc.toJSON() as Record<string, unknown>));
}

export async function getBlogPost(
  slug: string,
  options: BlogQueryOptions = {},
): Promise<BlogPost | null> {
  await connectToDatabase();

  const query: Record<string, unknown> = { slug };
  if (!options.includeDrafts) {
    query.isPublished = true;
  }

  const doc = await BlogPostModel.findOne(query);
  return doc ? mapToBlogPost(doc.toJSON() as Record<string, unknown>) : null;
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  await connectToDatabase();

  const doc = await BlogPostModel.findById(id);
  return doc ? mapToBlogPost(doc.toJSON() as Record<string, unknown>) : null;
}

export async function getBlogCategories(): Promise<string[]> {
  const posts = await getBlogPosts();
  const categories = new Set(posts.map((post) => post.category).filter(Boolean));
  return ['All', ...Array.from(categories)];
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getBlogPosts();
  const tagCounts = new Map<string, number>();

  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
