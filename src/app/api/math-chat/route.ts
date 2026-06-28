import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MATH_AI_SYSTEM_PROMPT } from '@/lib/prompts/math-ai-prompt';
import { runChat, getModelById, type ProviderMessage, type ChatImage } from '@/lib/ai/providers';
import { DEFAULT_MODEL_ID, VISION_FALLBACK_MODEL_ID } from '@/lib/ai/models';
import { checkDailyLimit } from '@/lib/ai/daily-limit';
import { queryWolfram } from '@/lib/ai/wolfram';
import { searchMathStackExchange, searchArxiv, type KnowledgeSource } from '@/lib/ai/knowledge';

export const runtime = 'nodejs';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const DAILY_LIMIT = 50;
const MAX_IMAGE_CHARS = 9_000_000;

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

  let modelId = typeof body.model === 'string' && body.model ? body.model : DEFAULT_MODEL_ID;
  if (image) {
    const chosen = getModelById(modelId);
    if (!chosen || !chosen.vision) {
      modelId = VISION_FALLBACK_MODEL_ID;
    }
  }

  const deep = body.deep === true;

  try {
    let systemPrompt = MATH_AI_SYSTEM_PROMPT;
    let sources: KnowledgeSource[] = [];

    if (deep && !image) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const question = lastUser ? lastUser.content.slice(0, 600) : '';

      if (question) {
        const [wolframRes, seRes, axRes] = await Promise.allSettled([
          queryWolfram(question),
          searchMathStackExchange(question),
          searchArxiv(question),
        ]);

        const parts: string[] = [];

        if (wolframRes.status === 'fulfilled' && wolframRes.value) {
          parts.push(
            'WOLFRAM|ALPHA VERIFIED COMPUTATION (trust these numeric/symbolic results):\n' +
              wolframRes.value,
          );
        }
        if (seRes.status === 'fulfilled' && seRes.value.context) {
          parts.push('MATH STACKEXCHANGE DISCUSSIONS:\n' + seRes.value.context);
          sources = sources.concat(seRes.value.sources);
        }
        if (axRes.status === 'fulfilled' && axRes.value.context) {
          parts.push('ARXIV MATH PAPERS:\n' + axRes.value.context);
          sources = sources.concat(axRes.value.sources);
        }

        if (parts.length > 0) {
          systemPrompt =
            MATH_AI_SYSTEM_PROMPT +
            '\n\n==================================================================\n' +
            'SECTION 15 — LIVE REFERENCE MATERIAL (retrieved for THIS question)\n' +
            '==================================================================\n' +
            'The app retrieved the material below to help you answer more accurately.\n' +
            '- Trust the Wolfram|Alpha computation for the numeric/symbolic result, but still\n' +
            '  show the full human reasoning and explanation.\n' +
            '- When you use a Math StackExchange discussion or an arXiv paper, cite it inline as\n' +
            '  a Markdown link, for example [source](URL).\n' +
            '- If a reference is irrelevant, simply ignore it. Never invent references.\n\n' +
            parts.join('\n\n');
        }
      }
    }

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
        // keep the first answer if the verification pass fails
      }
    }

    return NextResponse.json({ reply, sources });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
