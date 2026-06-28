import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MATH_AI_SYSTEM_PROMPT } from '@/lib/prompts/math-ai-prompt';
import { PROOF_TECHNIQUES } from '@/lib/prompts/proof-techniques';
import {
  runChat,
  streamChat,
  getModelById,
  getApiKey,
  type ProviderMessage,
  type ChatImage,
} from '@/lib/ai/providers';
import { DEFAULT_MODEL_ID, VISION_FALLBACK_MODEL_ID } from '@/lib/ai/models';
import { checkDailyLimit } from '@/lib/ai/daily-limit';
import { queryWolfram } from '@/lib/ai/wolfram';
import {
  searchMathStackExchange,
  searchArxiv,
  searchSemanticScholar,
  searchOpenAlex,
  searchWeb,
  type KnowledgeResult,
  type KnowledgeSource,
} from '@/lib/ai/knowledge';

export const runtime = 'nodejs';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const DAILY_LIMIT = 50;
const MAX_IMAGE_CHARS = 9_000_000;
const EMPTY: KnowledgeResult = { context: '', sources: [] };

const SYSTEM_BASE = MATH_AI_SYSTEM_PROMPT + '\n\n' + PROOF_TECHNIQUES;

const VERIFY_INSTRUCTION =
  'You are now a strict verifier of the solution you just gave. Re-check it step by step: ' +
  'recompute the key steps, substitute the result back into the original problem, and check ' +
  'edge cases, signs, and domains. If everything is correct, return the SAME full solution, ' +
  'cleanly formatted, and add a final line exactly: Verified \u2713. If you find any mistake, fix ' +
  'it and return the complete corrected solution (still ending with the verified final answer). ' +
  'Keep all mathematics in LaTeX. Do not mention that you are verifying — just return the solution.';

function parseDataUrl(dataUrl: string): ChatImage | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], dataBase64: match[2], dataUrl };
}

function settledKnowledge(r: PromiseSettledResult<KnowledgeResult>): KnowledgeResult {
  return r.status === 'fulfilled' ? r.value : EMPTY;
}

function wantsResearch(q: string): boolean {
  return /\b(paper|papers|research|arxiv|preprint|reference|references|citation|cite|journal|publication|survey|literature|state of the art|open problem|who proved|history of|latest|recent)\b/i.test(
    q,
  );
}

function wantsComputation(q: string): boolean {
  return (
    /\b(solve|simplify|factor|expand|integrate|integral|differentiate|derivative|evaluate|compute|calculate|roots?|limit|determinant|eigen|matrix|sum|product)\b/i.test(
      q,
    ) || /[=]/.test(q)
  );
}

export async function POST(req: NextRequest) {
  await auth.protect();
  const { userId } = await auth();
  const identity = userId || 'anonymous';

  const limited = checkDailyLimit(identity, 'math-chat', DAILY_LIMIT);
  if (limited) return limited;

  let body: { messages?: ChatMessage[]; model?: string; image?: string; deep?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (rawMessages.length === 0) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const messages: ProviderMessage[] = rawMessages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || ''),
  }));

  let image: ChatImage | undefined;
  if (typeof body.image === 'string' && body.image) {
    if (body.image.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ error: 'Image is too large. Please use one under 5 MB.' }, { status: 400 });
    }
    const parsed = parseDataUrl(body.image);
    if (!parsed) {
      return NextResponse.json({ error: 'Could not read the attached image.' }, { status: 400 });
    }
    image = parsed;
  }

  // Images are ALWAYS read by Gemini, no matter what is selected.
  let modelId = typeof body.model === 'string' && body.model ? body.model : DEFAULT_MODEL_ID;
  if (image) {
    modelId = VISION_FALLBACK_MODEL_ID;
  } else if (!getModelById(modelId)) {
    modelId = DEFAULT_MODEL_ID;
  }

  const deep = body.deep === true;

  // Fail fast with a friendly message if the chosen model has no key.
  const chosenModel = getModelById(modelId);
  if (chosenModel && !getApiKey(chosenModel)) {
    return NextResponse.json(
      {
        error:
          'The model "' +
          chosenModel.label +
          '" is not set up yet. Add ' +
          chosenModel.envKey +
          ' in your Vercel environment variables, then redeploy.',
      },
      { status: 500 },
    );
  }

  try {
    let systemPrompt = SYSTEM_BASE;
    let sources: KnowledgeSource[] = [];

    if (!image) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const question = lastUser ? lastUser.content.slice(0, 600) : '';

      if (question) {
        const research = deep || wantsResearch(question);
        const computeOnly = !research && wantsComputation(question);
        const skip = (): Promise<KnowledgeResult> => Promise.resolve(EMPTY);

        const [wolframRes, seRes, axRes, s2Res, oaRes, webRes] = await Promise.allSettled([
          queryWolfram(question),
          computeOnly ? skip() : searchMathStackExchange(question),
          research ? searchArxiv(question) : skip(),
          research ? searchSemanticScholar(question) : skip(),
          research ? searchOpenAlex(question) : skip(),
          research ? searchWeb(question) : skip(),
        ]);

        const parts: string[] = [];

        if (wolframRes.status === 'fulfilled' && wolframRes.value) {
          parts.push(
            'WOLFRAM|ALPHA VERIFIED COMPUTATION (trust these numeric/symbolic results):\n' +
              wolframRes.value,
          );
        }

        const se = settledKnowledge(seRes);
        if (se.context) {
          parts.push('MATH STACKEXCHANGE DISCUSSIONS:\n' + se.context);
          sources = sources.concat(se.sources);
        }

        const ax = settledKnowledge(axRes);
        if (ax.context) {
          parts.push('ARXIV MATH PAPERS:\n' + ax.context);
          sources = sources.concat(ax.sources);
        }

        const s2 = settledKnowledge(s2Res);
        if (s2.context) {
          parts.push('SEMANTIC SCHOLAR PAPERS:\n' + s2.context);
          sources = sources.concat(s2.sources);
        }

        const oa = settledKnowledge(oaRes);
        if (oa.context) {
          parts.push('OPENALEX PAPERS:\n' + oa.context);
          sources = sources.concat(oa.sources);
        }

        const web = settledKnowledge(webRes);
        if (web.context) {
          parts.push('LIVE WEB SEARCH RESULTS:\n' + web.context);
          sources = sources.concat(web.sources);
        }

        if (parts.length > 0) {
          systemPrompt =
            SYSTEM_BASE +
            '\n\n==================================================================\n' +
            'SECTION 15 — LIVE REFERENCE MATERIAL (retrieved for THIS question)\n' +
            '==================================================================\n' +
            'The app retrieved the material below to help you answer more accurately.\n' +
            '- Trust the Wolfram|Alpha computation for the numeric/symbolic result, but still\n' +
            '  show the full human reasoning and explanation.\n' +
            '- When you use a discussion, paper, or web page, cite it inline as a Markdown\n' +
            '  link, for example [source](URL).\n' +
            '- If a reference is irrelevant, simply ignore it. Never invent references.\n\n' +
            parts.join('\n\n');
        }
      }
    }

    // Non-streaming path: images (vision) and Deep mode (needs a 2nd verify pass).
    if (image || deep) {
      let reply = await runChat(modelId, systemPrompt, messages, image);

      if (deep) {
        const verifyMessages: ProviderMessage[] = [
          ...messages,
          { role: 'assistant', content: reply },
          { role: 'user', content: VERIFY_INSTRUCTION },
        ];
        try {
          const verified = await runChat(modelId, systemPrompt, verifyMessages);
          if (verified && verified.trim()) reply = verified;
        } catch {
          // keep the first answer if verification fails
        }
      }

      return NextResponse.json({ reply, sources });
    }

    // Streaming path: normal text questions stream live, token by token.
    const encoder = new TextEncoder();
    const streamModelId = modelId;
    const streamSystem = systemPrompt;
    const streamMessages = messages;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of streamChat(streamModelId, streamSystem, streamMessages)) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Streaming error';
          controller.enqueue(encoder.encode('\n\n[Error: ' + msg + ']'));
        } finally {
          controller.close();
        }
      },
    });

    const headers = new Headers();
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('x-stream', '1');
    headers.set(
      'x-sources',
      Buffer.from(encodeURIComponent(JSON.stringify(sources))).toString('base64'),
    );
    return new Response(stream, { headers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
