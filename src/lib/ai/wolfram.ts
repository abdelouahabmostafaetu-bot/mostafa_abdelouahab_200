/**
 * Wolfram|Alpha verification helper (used by Math AI "Deep mode").
 *
 * Uses the Wolfram|Alpha LLM API, which returns plain-text results designed to
 * be read by an AI. This is OPTIONAL: it only works when WOLFRAM_APP_ID is set.
 * Get a free App ID (2,000 calls/month) at https://developer.wolframalpha.com
 *
 * Returns a short plain-text computation result, or null if it is not
 * configured or Wolfram has nothing useful to say. Never throws.
 */

export async function queryWolfram(query: string): Promise<string | null> {
  const appId = process.env.WOLFRAM_APP_ID;
  if (!appId) return null;

  const trimmed = query.trim();
  if (!trimmed) return null;

  const endpoint =
    'https://www.wolframalpha.com/api/v1/llm-api?appid=' +
    encodeURIComponent(appId) +
    '&maxchars=1500&input=' +
    encodeURIComponent(trimmed);

  try {
    const res = await fetch(endpoint, {
      headers: { 'User-Agent': 'mostafaabdelouahab.me math-ai' },
    });
    const text = await res.text();
    if (!res.ok) return null;
    const clean = text.trim();
    if (!clean) return null;
    return clean.slice(0, 1500);
  } catch {
    return null;
  }
}
