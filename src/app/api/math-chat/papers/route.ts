import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'Missing search query.' }, { status: 400 });
  }

  const url =
    'https://export.arxiv.org/api/query?search_query=' +
    encodeURIComponent(`all:${q}`) +
    '&start=0&max_results=30&sortBy=relevance';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'mostafaabdelouahab.me math-ai' },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'arXiv request failed.' }, { status: 502 });
    }
    const xml = await res.text();
    const entries = xml
      .split('<entry>')
      .slice(1)
      .map((e) => e.split('</entry>')[0]);

    const papers = entries
      .map((entry) => {
        const primary = entry.match(/<arxiv:primary_category[^>]*term="([^"]+)"/);
        const category = primary ? primary[1] : '';
        const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
        const link = idMatch ? decode(idMatch[1]) : '';
        const pdf = link.replace('/abs/', '/pdf/');
        const authors = (entry.match(/<name>([\s\S]*?)<\/name>/g) || [])
          .map((a) => decode(a.replace(/<\/?name>/g, '')))
          .slice(0, 4)
          .join(', ');
        const published = tag(entry, 'published').slice(0, 10);
        return {
          title: tag(entry, 'title'),
          authors,
          summary: tag(entry, 'summary'),
          published,
          link,
          pdf,
          category,
        };
      })
      .filter((p) => p.category.startsWith('math'))
      .slice(0, 12);

    return NextResponse.json({ papers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
