import { NextRequest, NextResponse } from 'next/server';
import { renderMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit, getUnknownFields, isPlainObject, jsonError } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'blog-preview-post', 60);
  if (limited) return limited;

  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          content?: string;
        }
      | null;

    if (!isPlainObject(body)) {
      return jsonError('Request body must be a JSON object.', 400);
    }

    const unknownFields = getUnknownFields(body, ['content']);
    if (unknownFields.length > 0) {
      return jsonError(`Unknown field: ${unknownFields[0]}.`, 400);
    }

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
