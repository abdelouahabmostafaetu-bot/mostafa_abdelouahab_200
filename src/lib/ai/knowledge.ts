/**
 * Live math knowledge retrieval for the Math AI "Deep mode".
 *
 * - Math StackExchange via the free Stack Exchange API (no key needed).
 * - arXiv math papers via the public Atom API (no key needed).
 * - Semantic Scholar (200M+ papers, AI relevance) via its free Graph API.
 *   No key required; an optional SEMANTIC_SCHOLAR_API_KEY raises the quota.
 * - OpenAlex (470M+ works + citations) via its free API. No key required;
 *   set OPENALEX_MAILTO to join the faster "polite pool".
 *
 * Each function returns a compact text "context" block to feed the model, plus
 * a list of clickable sources to show the user. Nothing here ever throws.
 */

export type KnowledgeSource = {
  title: string;
  url: string;
  kind: 'stackexchange' | 'arxiv' | 'semanticscholar' | 'openalex';
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

export async function searchArxiv(query: string, max = 2): Promise<KnowledgeResult> {
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

type S2Author = { name?: string };
type S2Paper = {
  paperId?: string;
  title?: string;
  abstract?: string | null;
  url?: string;
  year?: number;
  authors?: S2Author[];
};
type S2Resp = { data?: S2Paper[] };

export async function searchSemanticScholar(query: string, max = 3): Promise<KnowledgeResult> {
  const q = query.trim();
  if (!q) return { context: '', sources: [] };

  const url =
    'https://api.semanticscholar.org/graph/v1/paper/search?limit=' +
    String(max) +
    '&fields=title,abstract,url,year,authors&query=' +
    encodeURIComponent(q);

  const headers: Record<string, string> = { 'User-Agent': 'mostafaabdelouahab.me math-ai' };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return { context: '', sources: [] };
    const data = (await res.json()) as S2Resp;
    const papers = (data.data || []).filter((p) => p.title && p.url).slice(0, max);
    if (papers.length === 0) return { context: '', sources: [] };

    const sources: KnowledgeSource[] = papers.map((p) => ({
      title: String(p.title),
      url: String(p.url),
      kind: 'semanticscholar',
    }));

    const blocks = papers.map((p, i) => {
      const yr = p.year ? ' (' + String(p.year) + ')' : '';
      const abs = (p.abstract || '').replace(/\s+/g, ' ').trim().slice(0, 400);
      return (
        '[' + String(i + 1) + '] ' + p.title + yr + ' (' + p.url + ')\n' + (abs || 'No abstract available.')
      );
    });

    return { context: blocks.join('\n\n'), sources };
  } catch {
    return { context: '', sources: [] };
  }
}

type OaLocation = { landing_page_url?: string };
type OaWork = {
  id?: string;
  title?: string | null;
  doi?: string | null;
  publication_year?: number;
  primary_location?: OaLocation | null;
  abstract_inverted_index?: Record<string, number[]> | null;
};
type OaResp = { results?: OaWork[] };

function abstractFromInverted(inv?: Record<string, number[]> | null): string {
  if (!inv) return '';
  const words: string[] = [];
  for (const key of Object.keys(inv)) {
    for (const pos of inv[key]) {
      words[pos] = key;
    }
  }
  return words.join(' ').replace(/\s+/g, ' ').trim();
}

export async function searchOpenAlex(query: string, max = 2): Promise<KnowledgeResult> {
  const q = query.trim();
  if (!q) return { context: '', sources: [] };

  const mailto = process.env.OPENALEX_MAILTO
    ? '&mailto=' + encodeURIComponent(process.env.OPENALEX_MAILTO)
    : '';
  const url =
    'https://api.openalex.org/works?per_page=' +
    String(max) +
    '&search=' +
    encodeURIComponent(q) +
    mailto;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'mostafaabdelouahab.me math-ai' } });
    if (!res.ok) return { context: '', sources: [] };
    const data = (await res.json()) as OaResp;
    const works = (data.results || []).slice(0, max);
    if (works.length === 0) return { context: '', sources: [] };

    const picked = works
      .map((w) => {
        const link = w.primary_location?.landing_page_url || w.doi || w.id || '';
        return {
          title: (w.title || '').trim(),
          year: w.publication_year,
          link,
          abstract: abstractFromInverted(w.abstract_inverted_index),
        };
      })
      .filter((w) => w.title && w.link);

    if (picked.length === 0) return { context: '', sources: [] };

    const sources: KnowledgeSource[] = picked.map((w) => ({
      title: w.title,
      url: w.link,
      kind: 'openalex',
    }));

    const blocks = picked.map((w, i) => {
      const yr = w.year ? ' (' + String(w.year) + ')' : '';
      return (
        '[' +
        String(i + 1) +
        '] ' +
        w.title +
        yr +
        ' (' +
        w.link +
        ')\n' +
        (w.abstract ? w.abstract.slice(0, 400) : 'No abstract available.')
      );
    });

    return { context: blocks.join('\n\n'), sources };
  } catch {
    return { context: '', sources: [] };
  }
}
