import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are "Math AI", a rigorous assistant that ONLY helps with mathematics.
Rules:
- Answer ONLY mathematics questions (algebra, analysis, topology, geometry, number theory, probability, logic, etc.).
- If a question is not about mathematics, politely refuse in one sentence and invite a math question.
- Always show clear, step-by-step reasoning.
- Write all formulas in LaTeX: inline math between single dollar signs and displayed math between double dollar signs.
- Be precise and concise. Prefer correct, well-structured explanations.`;

export async function POST(req: NextRequest) {
  await auth.protect();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server is missing GEMINI_API_KEY. Add it in your environment variables.' },
      { status: 500 },
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }],
  }));

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const message = data?.error?.message || 'Gemini API error';
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || '')
        .join('') || 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
