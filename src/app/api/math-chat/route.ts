import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MATH_AI_SYSTEM_PROMPT } from '@/lib/prompts/math-ai-prompt';
import { runChat, getModelById, type ProviderMessage, type ChatImage } from '@/lib/ai/providers';
import { DEFAULT_MODEL_ID, VISION_FALLBACK_MODEL_ID } from '@/lib/ai/models';
import { checkDailyLimit } from '@/lib/ai/daily-limit';

export const runtime = 'nodejs';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const DAILY_LIMIT = 50;
const MAX_IMAGE_CHARS = 9_000_000;

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

  let body: { messages?: ChatMessage[]; model?: string; image?: string };
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

  try {
    const reply = await runChat(modelId, MATH_AI_SYSTEM_PROMPT, messages, image);
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
