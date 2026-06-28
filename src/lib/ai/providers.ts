/**
 * Server-side AI provider router.
 * - Gemini uses Google's native API.
 * - OpenRouter, Mistral and OpenAI use the OpenAI-compatible
 *   /chat/completions format.
 *
 * Supports an optional image attached to the latest user message (vision).
 * Secrets are read from process.env at request time and never sent to browsers.
 */

import { AI_MODELS, type AiModel } from './models';

export type ChatRole = 'user' | 'assistant';
export type ProviderMessage = { role: ChatRole; content: string };
export type ChatImage = { mimeType: string; dataBase64: string; dataUrl: string };

// Longer answers: hard proofs / multi-step solutions used to get cut off at 4096.
const MAX_OUTPUT_TOKENS = 8192;

const OPENAI_COMPATIBLE_BASE: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  mistral: 'https://api.mistral.ai/v1',
  openai: 'https://api.openai.com/v1',
};

type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

type OpenAiContentPart = { type: string; text?: string; image_url?: { url: string } };
type OpenAiMessage = { role: string; content: string | OpenAiContentPart[] };
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
  image?: ChatImage,
): Promise<string> {
  const endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    modelName +
    ':generateContent?key=' +
    apiKey;

  const lastIndex = messages.length - 1;
  const contents = messages.map((m, idx) => {
    const parts: GeminiPart[] = [{ text: m.content }];
    if (image && idx === lastIndex && m.role === 'user') {
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.dataBase64 } });
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: MAX_OUTPUT_TOKENS },
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
  image?: ChatImage,
): Promise<string> {
  const endpoint = base + '/chat/completions';
  const lastIndex = messages.length - 1;

  const mapped: OpenAiMessage[] = messages.map((m, idx) => {
    if (image && idx === lastIndex && m.role === 'user') {
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          { type: 'image_url', image_url: { url: image.dataUrl } },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const payloadMessages: OpenAiMessage[] = [{ role: 'system', content: system }, ...mapped];

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
      max_tokens: MAX_OUTPUT_TOKENS,
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
  image?: ChatImage,
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
    return runGemini(apiKey, model.model, system, messages, image);
  }

  const base = OPENAI_COMPATIBLE_BASE[model.provider];
  if (!base) {
    throw new Error('Unsupported provider: ' + model.provider);
  }
  return runOpenAiCompatible(base, apiKey, model.model, system, messages, image);
}
