/**
 * Server-side AI provider router.
 * Sends a chat to whichever provider the chosen model belongs to.
 * - Gemini uses Google's native API.
 * - Groq, Cerebras, OpenRouter, Mistral, NVIDIA and OpenAI all use the
 *   OpenAI-compatible /chat/completions format, so they share one function.
 *
 * Secrets are read from process.env at request time and never sent to the
 * browser.
 */

import { AI_MODELS, type AiModel } from './models';

export type ChatRole = 'user' | 'assistant';
export type ProviderMessage = { role: ChatRole; content: string };

const OPENAI_COMPATIBLE_BASE: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  cerebras: 'https://api.cerebras.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  mistral: 'https://api.mistral.ai/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1',
  openai: 'https://api.openai.com/v1',
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

type OpenAiResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string } | string;
};

export function getModelById(id: string): AiModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

export function getApiKey(model: AiModel): string | undefined {
  return process.env[model.envKey];
}

async function runGemini(
  apiKey: string,
  modelName: string,
  system: string,
  messages: ProviderMessage[],
): Promise<string> {
  const endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    modelName +
    ':generateContent?key=' +
    apiKey;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    }),
  });

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || 'Gemini API error');
  }

  const parts = data.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => p.text || '').join('') : '';
  return text || 'Sorry, I could not generate a response.';
}

async function runOpenAiCompatible(
  base: string,
  apiKey: string,
  modelName: string,
  system: string,
  messages: ProviderMessage[],
): Promise<string> {
  const endpoint = base + '/chat/completions';
  const payloadMessages = [{ role: 'system', content: system }, ...messages];

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: modelName,
      messages: payloadMessages,
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  const data = (await res.json()) as OpenAiResponse;
  if (!res.ok) {
    const e = data.error;
    const msg = typeof e === 'string' ? e : e?.message || 'AI provider error';
    throw new Error(msg);
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content;
  }
  return 'Sorry, I could not generate a response.';
}

export async function runChat(
  modelId: string,
  system: string,
  messages: ProviderMessage[],
): Promise<string> {
  const model = getModelById(modelId) || getModelById('gemini-flash');
  if (!model) {
    throw new Error('No AI model is configured on this site.');
  }

  const apiKey = getApiKey(model);
  if (!apiKey) {
    throw new Error(
      'The model "' +
        model.label +
        '" is not set up yet. Add ' +
        model.envKey +
        ' in your Vercel environment variables, then redeploy.',
    );
  }

  if (model.provider === 'gemini') {
    return runGemini(apiKey, model.model, system, messages);
  }

  const base = OPENAI_COMPATIBLE_BASE[model.provider];
  if (!base) {
    throw new Error('Unsupported provider: ' + model.provider);
  }
  return runOpenAiCompatible(base, apiKey, model.model, system, messages);
}
