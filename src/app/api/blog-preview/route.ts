import { NextRequest, NextResponse } from 'next/server';
import { renderMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import { requireAdmin } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'blog-preview-post', 60);
  if (limited) return limited;

  await requireAdmin();

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          content?: string;
        }
      | null;

    const content =
      String(body?.content ?? '').trim() ||
      '## Preview\n\nStart writing in the editor and your formatted post will appear here.';

    const html = await renderMarkdownPreviewToHtml(content);
    return NextResponse.json(
      { html: `<div class="prose-academic">${html}</div>` },
      { status: 200 },
    );
  } catch (error) {
    console.error('POST /api/blog-preview failed:', error);
    return NextResponse.json({ error: 'Failed to render preview.' }, { status: 500 });
  }
}
