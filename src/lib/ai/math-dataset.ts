/**
 * LIVE MATH DATASET RETRIEVAL
 * ----------------------------------------------------------------
 * Pulls real solved math problems/answers from a Hugging Face dataset (via the
 * free datasets-server API) and returns them as grounding context for the AI.
 *
 * - No API key required.
 * - Self-discovering: it asks the API which config/split exist, so we never
 *   hard-code names that might change.
 * - Tries full-text SEARCH first; if that is unavailable it falls back to a
 *   sample of ROWS so the feature still returns real examples.
 * - Never throws and always times out fast, so it can never break the chat.
 */

import type { KnowledgeResult, KnowledgeSource } from './knowledge';

const DATASET = 'math-ai/StackMathQA';
const DATASET_PAGE = 'https://huggingface.co/datasets/math-ai/StackMathQA';
const BASE = 'https://datasets-server.huggingface.co';

type SplitItem = { dataset: string; config: string; split: string };
type SplitsResp = { splits?: SplitItem[] };
type Row = { row?: Record<string, unknown> };
type RowsResp = { rows?: Row[] };

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'mostafaabdelouahab.me math-ai' },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let cachedSplit: SplitItem | null = null;

async function pickSplit(): Promise<SplitItem | null> {
  if (cachedSplit) return cachedSplit;
  const data = await fetchJson<SplitsResp>(
    BASE + '/splits?dataset=' + encodeURIComponent(DATASET),
    8000,
  );
  const splits = data && data.splits ? data.splits : [];
  if (splits.length === 0) return null;
  const train = splits.find((s) => s.split === 'train');
  cachedSplit = train || splits[0];
  return cachedSplit;
}

function textFromRow(row: Record<string, unknown>): string {
  const preferred = ['Q', 'A', 'question', 'answer', 'problem', 'solution', 'title', 'body', 'text'];
  const parts: string[] = [];
  for (const key of preferred) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) parts.push(value.trim());
  }
  if (parts.length === 0) {
    for (const key of Object.keys(row)) {
      const value = row[key];
      if (typeof value === 'string' && value.trim()) parts.push(value.trim());
    }
  }
  return parts.join('\n').replace(/\s+/g, ' ').trim();
}

export async function searchMathDataset(query: string, max = 2): Promise<KnowledgeResult> {
  const q = query.trim();
  if (!q) return { context: '', sources: [] };

  const split = await pickSplit();
  if (!split) return { context: '', sources: [] };

  const common =
    'dataset=' +
    encodeURIComponent(split.dataset) +
    '&config=' +
    encodeURIComponent(split.config) +
    '&split=' +
    encodeURIComponent(split.split);

  let rows: Row[] = [];

  const searchData = await fetchJson<RowsResp>(
    BASE +
      '/search?' +
      common +
      '&query=' +
      encodeURIComponent(q) +
      '&offset=0&length=' +
      String(max),
    9000,
  );
  if (searchData && searchData.rows && searchData.rows.length > 0) {
    rows = searchData.rows;
  } else {
    const rowsData = await fetchJson<RowsResp>(
      BASE + '/rows?' + common + '&offset=0&length=' + String(max),
      9000,
    );
    if (rowsData && rowsData.rows) rows = rowsData.rows;
  }

  const blocks: string[] = [];
  rows.slice(0, max).forEach((r, i) => {
    const text = r.row ? textFromRow(r.row) : '';
    if (text) blocks.push('[' + String(i + 1) + '] ' + text.slice(0, 700));
  });

  if (blocks.length === 0) return { context: '', sources: [] };

  const sources: KnowledgeSource[] = [
    { title: 'Curated math dataset (StackMathQA)', url: DATASET_PAGE, kind: 'web' },
  ];

  return { context: blocks.join('\n\n'), sources };
}
