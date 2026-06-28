import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MATH_AI_SYSTEM_PROMPT } from '@/lib/prompts/math-ai-prompt';
import { runChat, type ProviderMessage } from '@/lib/ai/providers';
import { DEFAULT_MODEL_ID } from '@/lib/ai/models';
import { checkDailyLimit } from '@/lib/ai/daily-limit';

export const runtime = 'nodejs';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const DAILY_LIMIT = 50;

export async function POST(req: NextRequest) {
  await auth.protect();
  const { userId } = await auth();
  const identity = userId || 'anonymous';

  const limited = checkDailyLimit(identity, 'math-chat', DAILY_LIMIT);
  if (limited) return limited;

  let body: { messages?: ChatMessage[]; model?: string };
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

  const modelId = typeof body.model === 'string' && body.model ? body.model : DEFAULT_MODEL_ID;

  try {
    const reply = await runChat(modelId, MATH_AI_SYSTEM_PROMPT, messages);
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
