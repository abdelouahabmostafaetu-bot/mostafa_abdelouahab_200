import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BlogPostModel from '@/lib/models/blog-post';
import { buildExcerpt, normalizeBlogSlug, normalizeTags } from '@/lib/content';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'gemini-2.5-flash';

type ClientMessage = { role: 'user' | 'assistant'; content: string };

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

type GeminiContent = { role: string; parts: GeminiPart[] };

type FunctionCallPart = { functionCall: { name: string; args: Record<string, unknown> } };

const SYSTEM_PROMPT = [
  'You are "Admin AI", the website management assistant for a mathematics academic website.',
  'You help the administrator manage blog posts: list, read, create, edit, publish, unpublish, and delete them.',
  'Use the provided tools to perform real actions on the website database.',
  'Guidelines:',
  '- Blog content is written in Markdown/MDX. Use LaTeX for math: inline with single dollar signs and display with double dollar signs.',
  '- When creating or editing a post, write clear, well-structured, professional content unless the admin gives exact text.',
  '- Before deleting a post or unpublishing it, ALWAYS confirm with the admin first by describing what will be affected, and only call the tool after they agree.',
  '- To find a post id, call list_blog_posts first. Never invent ids.',
  '- After an action succeeds, briefly confirm what changed (the title and whether it is published).',
  '- Stay focused on managing this website. Politely decline unrelated requests.',
].join('\n');

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'list_blog_posts',
        description:
          'List blog posts (both published and drafts). Optionally filter by a search term matching title, slug, or category.',
        parameters: {
          type: 'OBJECT',
          properties: {
            search: { type: 'STRING', description: 'Optional search term.' },
          },
        },
      },
      {
        name: 'get_blog_post',
        description: 'Get the full content and all fields of one blog post by its id.',
        parameters: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING', description: 'The blog post id.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_blog_post',
        description: 'Create a new blog post.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            content: { type: 'STRING', description: 'Full post body in Markdown/MDX.' },
            category: { type: 'STRING' },
            tags: { type: 'ARRAY', items: { type: 'STRING' } },
            excerpt: { type: 'STRING' },
            isPublished: {
              type: 'BOOLEAN',
              description: 'True to publish immediately, false to save as a draft.',
            },
          },
          required: ['title', 'content'],
        },
      },
      {
        name: 'update_blog_post',
        description:
          'Update an existing blog post by id. Only the fields you provide are changed; omitted fields keep their current value.',
        parameters: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            title: { type: 'STRING' },
            content: { type: 'STRING' },
            category: { type: 'STRING' },
            tags: { type: 'ARRAY', items: { type: 'STRING' } },
            excerpt: { type: 'STRING' },
            isPublished: { type: 'BOOLEAN' },
            slug: { type: 'STRING' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_blog_post',
        description:
          'Permanently delete a blog post by id. Always confirm with the admin before calling this.',
        parameters: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
          },
          required: ['id'],
        },
      },
    ],
  },
];

function getFunctionCall(part: GeminiPart): FunctionCallPart | null {
  if (typeof part === 'object' && part !== null && 'functionCall' in part) {
    return part as FunctionCallPart;
  }
  return null;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ response: Record<string, unknown>; action?: string }> {
  await connectToDatabase();

  if (name === 'list_blog_posts') {
    const search = String(args.search ?? '').trim().toLowerCase();
    const docs = await BlogPostModel.find({}).sort({ updatedAt: -1, _id: -1 }).limit(100);
    let posts = docs.map((doc) => {
      const j = doc.toJSON() as Record<string, unknown>;
      return {
        id: String(j.id ?? ''),
        title: String(j.title ?? ''),
        slug: String(j.slug ?? ''),
        category: String(j.category ?? ''),
        isPublished: Boolean(j.isPublished),
        updatedAt: String(j.updatedAt ?? ''),
      };
    });
    if (search) {
      posts = posts.filter((p) =>
        [p.title, p.slug, p.category].some((v) => v.toLowerCase().includes(search)),
      );
    }
    return { response: { count: posts.length, posts } };
  }

  if (name === 'get_blog_post') {
    const id = String(args.id ?? '');
    if (!mongoose.isValidObjectId(id)) return { response: { error: 'Invalid post id.' } };
    const doc = await BlogPostModel.findById(id);
    if (!doc) return { response: { error: 'Post not found.' } };
    const j = doc.toJSON() as Record<string, unknown>;
    return {
      response: {
        post: {
          id: String(j.id ?? ''),
          title: j.title,
          slug: j.slug,
          category: j.category,
          tags: j.tags,
          excerpt: j.excerpt,
          coverImageUrl: j.coverImageUrl,
          content: j.content,
          isPublished: j.isPublished,
        },
      },
    };
  }

  if (name === 'create_blog_post') {
    const title = String(args.title ?? '').trim();
    const content = String(args.content ?? '').trim();
    if (!title || !content) return { response: { error: 'Title and content are required.' } };
    const category = String(args.category ?? '').trim() || 'Mathematics';
    const excerpt = String(args.excerpt ?? '').trim();
    const isPublished = Boolean(args.isPublished);
    const tags = normalizeTags((args.tags as string[] | string) ?? []);
    const slug = normalizeBlogSlug(title, '');
    const existing = await BlogPostModel.findOne({ slug });
    if (existing) {
      return {
        response: {
          error: 'A post with a similar title already exists (slug: ' + slug + '). Choose a different title.',
        },
      };
    }
    const now = new Date().toISOString();
    const post = await BlogPostModel.create({
      title,
      slug,
      excerpt: buildExcerpt(content, excerpt),
      category,
      tags,
      coverImageUrl: '',
      content,
      isPublished,
      createdAt: now,
      updatedAt: now,
      publishedAt: isPublished ? now : '',
    });
    return {
      response: { ok: true, id: String(post._id), slug: post.slug, isPublished: post.isPublished },
      action: (isPublished ? 'Published' : 'Saved draft') + ': ' + title,
    };
  }

  if (name === 'update_blog_post') {
    const id = String(args.id ?? '');
    if (!mongoose.isValidObjectId(id)) return { response: { error: 'Invalid post id.' } };
    const post = await BlogPostModel.findById(id);
    if (!post) return { response: { error: 'Post not found.' } };

    if (args.title !== undefined) post.title = String(args.title).trim();
    if (args.content !== undefined) post.content = String(args.content).trim();
    if (args.category !== undefined) post.category = String(args.category).trim() || 'Mathematics';
    if (args.excerpt !== undefined) post.excerpt = buildExcerpt(post.content, String(args.excerpt).trim());
    if (args.tags !== undefined) post.tags = normalizeTags(args.tags as string[] | string);
    if (args.slug !== undefined || args.title !== undefined) {
      post.slug = normalizeBlogSlug(post.title, String(args.slug ?? '').trim());
    }
    if (args.isPublished !== undefined) post.isPublished = Boolean(args.isPublished);

    if (!post.title || !post.content) {
      return { response: { error: 'Title and content cannot be empty.' } };
    }

    const dup = await BlogPostModel.findOne({ slug: post.slug, _id: { $ne: id } });
    if (dup) {
      return { response: { error: 'Another post already uses the slug: ' + post.slug } };
    }

    post.updatedAt = new Date().toISOString();
    if (post.isPublished && !post.publishedAt) post.publishedAt = post.updatedAt;
    if (!post.isPublished) post.publishedAt = '';

    await post.save();
    return {
      response: { ok: true, id: String(post._id), slug: post.slug, isPublished: post.isPublished },
      action: 'Updated: ' + post.title,
    };
  }

  if (name === 'delete_blog_post') {
    const id = String(args.id ?? '');
    if (!mongoose.isValidObjectId(id)) return { response: { error: 'Invalid post id.' } };
    const post = await BlogPostModel.findById(id);
    if (!post) return { response: { error: 'Post not found.' } };
    const title = post.title;
    await post.deleteOne();
    return { response: { ok: true }, action: 'Deleted: ' + title };
  }

  return { response: { error: 'Unknown tool: ' + name } };
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'admin-ai', 30);
  if (limited) return limited;

  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server is missing GEMINI_API_KEY.' }, { status: 500 });
  }

  let body: { messages?: ClientMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const contents: GeminiContent[] = incoming.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }],
  }));

  const endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    MODEL +
    ':generateContent?key=' +
    apiKey;

  const actions: string[] = [];

  try {
    for (let step = 0; step < 6; step++) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          tools: TOOLS,
          generationConfig: { temperature: 0.3 },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data?.error?.message || 'Gemini API error';
        return NextResponse.json({ error: message }, { status: res.status });
      }

      const candidate = data?.candidates?.[0];
      const parts: GeminiPart[] = candidate?.content?.parts ?? [];
      const calls = parts
        .map(getFunctionCall)
        .filter((c): c is FunctionCallPart => c !== null);

      if (calls.length === 0) {
        const reply = parts
          .map((p) => ('text' in p ? p.text : ''))
          .join('')
          .trim();
        return NextResponse.json({ reply: reply || 'Done.', actions });
      }

      contents.push({ role: 'model', parts });

      const responseParts: GeminiPart[] = [];
      for (const call of calls) {
        const fnName = call.functionCall.name;
        const fnArgs = call.functionCall.args || {};
        const result = await executeTool(fnName, fnArgs);
        if (result.action) actions.push(result.action);
        responseParts.push({ functionResponse: { name: fnName, response: result.response } });
      }
      contents.push({ role: 'function', parts: responseParts });
    }

    return NextResponse.json({
      reply: 'I completed several steps but reached the action limit. Please review and continue if needed.',
      actions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
