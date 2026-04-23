import { type NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FirecrawlWebResult = {
  title?: string;
  url?: string;
  description?: string;
  markdown?: string;
};

function getQuestionId(url: string | undefined): number {
  if (!url) return 0;
  const match = url.match(/\/questions\/(\d+)/);
  if (match?.[1]) return Number(match[1]);

  let hash = 0;
  for (let index = 0; index < url.length; index += 1) {
    hash = (hash * 31 + url.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) + 1_000_000_000;
}

function normalizeResult(result: FirecrawlWebResult) {
  return {
    question_id: getQuestionId(result.url),
    title: result.title || result.url || 'Web result',
    link: result.url || '#',
    score: 0,
    answer_count: 0,
    view_count: 0,
    creation_date: null,
    accepted_answer_id: null,
    tags: ['web-search'],
    owner: {},
    excerpt: result.description || result.markdown?.slice(0, 240) || '',
    item_type: 'web',
    _source: 'firecrawl',
  };
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'math-web-search', 30);
  if (limited) return limited;

  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const body = (await request.json().catch(() => null)) as
    | { query?: string; tags?: string[]; limit?: number }
    | null;
  const query = String(body?.query ?? '').trim();
  const tags = Array.isArray(body?.tags) ? body.tags.filter(Boolean).slice(0, 5) : [];
  const limit = Math.min(Math.max(Number(body?.limit ?? 5), 1), 8);

  if (!query) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const firecrawlQuery = [
    'site:math.stackexchange.com',
    'OR site:mathoverflow.net',
    query,
    tags.join(' '),
  ]
    .filter(Boolean)
    .join(' ');

  try {
    const response = await fetch('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: firecrawlQuery,
        sources: ['web'],
        limit,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const payload = (await response.json().catch(() => null)) as
      | { data?: { web?: FirecrawlWebResult[] } }
      | null;
    const items = (payload?.data?.web ?? []).map(normalizeResult);

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('POST /api/search/web failed:', error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
