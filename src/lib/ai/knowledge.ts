/**
 * Live math knowledge retrieval for the Math AI "Deep mode".
 *
 * - Math StackExchange via the free Stack Exchange API. No key is required for
 *   light use; an optional STACKEXCHANGE_KEY raises the daily quota.
 * - arXiv math papers via the public Atom API.
 *
 * Each function returns a compact text "context" block to feed the model, plus
 * a list of clickable sources to show the user. Nothing here ever throws.
 */

export type KnowledgeSource = {
  title: string;
  url: string;
  kind: 'stackexchange' | 'arxiv';
};

export type KnowledgeResult = {
  context: string;
  sources: KnowledgeSource[];
};

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

function stripHtml(html: string): string {
  return decode(html.replace(/<[^>]+>/g, ' '));
}

type SeSearchItem = { question_id: number; title: string; link: string; score: number };
type SeSearchResp = { items?: SeSearchItem[] };
type SeAnswer = { question_id: number; body?: string; score: number };
type SeAnswerResp = { items?: SeAnswer[] };

export async function searchMathStackExchange(query: string, max = 3): Promise<KnowledgeResult> {
  const q = query.trim();
  if (!q) return { context: '', sources: [] };

  const keyParam = process.env.STACKEXCHANGE_KEY
    ? '&key=' + encodeURIComponent(process.env.STACKEXCHANGE_KEY)
    : '';
  const headers = { 'User-Agent': 'mostafaabdelouahab.me math-ai' };

  const searchUrl =
    'https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance' +
    '&site=math.stackexchange&pagesize=' +
    String(max) +
    '&q=' +
    encodeURIComponent(q) +
    keyParam;

  try {
    const sres = await fetch(searchUrl, { headers });
    if (!sres.ok) return { context: '', sources: [] };
    const sdata = (await sres.json()) as SeSearchResp;
    const items = (sdata.items || []).slice(0, max);
    if (items.length === 0) return { context: '', sources: [] };

    const sources: KnowledgeSource[] = items.map((it) => ({
      title: stripHtml(it.title),
      url: it.link,
      kind: 'stackexchange',
    }));

    const ids = items.map((it) => String(it.question_id)).join(';');
    const ansUrl =
      'https://api.stackexchange.com/2.3/questions/' +
      encodeURIComponent(ids) +
      '/answers?order=desc&sort=votes&site=math.stackexchange&filter=withbody&pagesize=30' +
      keyParam;

    const bodyByQuestion = new Map<number, string>();
    try {
      const ares = await fetch(ansUrl, { headers });
      if (ares.ok) {
        const adata = (await ares.json()) as SeAnswerResp;
        for (const a of adata.items || []) {
          if (a.body && !bodyByQuestion.has(a.question_id)) {
            bodyByQuestion.set(a.question_id, stripHtml(a.body).slice(0, 700));
          }
        }
      }
    } catch {
      // ignore answer-body errors; titles + links are still useful
    }

    const blocks = items.map((it, i) => {
      const ans = bodyByQuestion.get(it.question_id);
      return (
        '[' +
        String(i + 1) +
        '] ' +
        stripHtml(it.title) +
        ' (' +
        it.link +
        ')\n' +
        (ans ? 'Top answer: ' + ans : 'See the linked discussion for the worked solution.')
      );
    });

    return { context: blocks.join('\n\n'), sources };
  } catch {
    return { context: '', sources: [] };
  }
}

export async function searchArxiv(query: string, max = 3): Promise<KnowledgeResult> {
  const q = query.trim();
  if (!q) return { context: '', sources: [] };

  const url =
    'https://export.arxiv.org/api/query?search_query=' +
    encodeURIComponent('all:' + q) +
    '&start=0&max_results=8&sortBy=relevance';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'mostafaabdelouahab.me math-ai' },
    });
    if (!res.ok) return { context: '', sources: [] };
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
        const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
        const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
        return {
          title: titleMatch ? decode(titleMatch[1]) : '',
          summary: summaryMatch ? decode(summaryMatch[1]) : '',
          link,
          category,
        };
      })
      .filter((p) => p.category.startsWith('math') && p.link && p.title)
      .slice(0, max);

    if (papers.length === 0) return { context: '', sources: [] };

    const sources: KnowledgeSource[] = papers.map((p) => ({
      title: p.title,
      url: p.link,
      kind: 'arxiv',
    }));

    const blocks = papers.map(
      (p, i) => '[' + String(i + 1) + '] ' + p.title + ' (' + p.link + ')\n' + p.summary.slice(0, 500),
    );

    return { context: blocks.join('\n\n'), sources };
  } catch {
    return { context: '', sources: [] };
  }
}
