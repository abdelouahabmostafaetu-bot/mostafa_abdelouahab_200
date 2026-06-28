/**
 * Server-side AI provider router.
 * - Gemini uses Google's native API.
 * - OpenRouter, Mistral and OpenAI use the OpenAI-compatible
 *   /chat/completions format.
 *
 * Supports:
 *   - runChat(): single full response (used for images + Deep verify pass).
 *   - streamChat(): live token-by-token streaming (used for normal answers).
 *
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

function resolveModel(modelId: string): AiModel {
  const model = getModelById(modelId) || getModelById('gemini-flash');
  if (!model) throw new Error('No AI model is configured on this site.');
  return model;
}

function requireKey(model: AiModel): string {
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
  return apiKey;
}

function buildGeminiContents(messages: ProviderMessage[], image?: ChatImage) {
  const lastIndex = messages.length - 1;
  return messages.map((m, idx) => {
    const parts: GeminiPart[] = [{ text: m.content }];
    if (image && idx === lastIndex && m.role === 'user') {
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.dataBase64 } });
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });
}

function buildOpenAiMessages(
  system: string,
  messages: ProviderMessage[],
  image?: ChatImage,
): OpenAiMessage[] {
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
  return [{ role: 'system', content: system }, ...mapped];
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

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: buildGeminiContents(messages, image),
      generationConfig: { temperature: 0.2, maxOutputTokens: MAX_OUTPUT_TOKENS },
    }),
  });

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API error');

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
  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: modelName,
      messages: buildOpenAiMessages(system, messages, image),
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
    }),
  });

  const data = (await res.json()) as OpenAiResponse;
  if (!res.ok) {
    const e = data.error;
    throw new Error(typeof e === 'string' ? e : e?.message || 'AI provider error');
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content;
  return 'Sorry, I could not generate a response.';
}

export async function runChat(
  modelId: string,
  system: string,
  messages: ProviderMessage[],
  image?: ChatImage,
): Promise<string> {
  const model = resolveModel(modelId);
  const apiKey = requireKey(model);

  if (model.provider === 'gemini') {
    return runGemini(apiKey, model.model, system, messages, image);
  }
  const base = OPENAI_COMPATIBLE_BASE[model.provider];
  if (!base) throw new Error('Unsupported provider: ' + model.provider);
  return runOpenAiCompatible(base, apiKey, model.model, system, messages, image);
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

async function* readSse(res: Response): AsyncGenerator<string> {
  const body = res.body;
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') return;
      yield payload;
    }
  }
}

async function* streamGemini(
  apiKey: string,
  modelName: string,
  system: string,
  messages: ProviderMessage[],
): AsyncGenerator<string> {
  const endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    modelName +
    ':streamGenerateContent?alt=sse&key=' +
    apiKey;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: buildGeminiContents(messages),
      generationConfig: { temperature: 0.2, maxOutputTokens: MAX_OUTPUT_TOKENS },
    }),
  });

  if (!res.ok) {
    let message = 'Gemini API error';
    try {
      const data = (await res.json()) as GeminiResponse;
      message = data.error?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  for await (const payload of readSse(res)) {
    try {
      const json = JSON.parse(payload) as GeminiResponse;
      const parts = json.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts) ? parts.map((p) => p.text || '').join('') : '';
      if (text) yield text;
    } catch {
      // skip malformed chunk
    }
  }
}

type OpenAiStreamChunk = {
  choices?: Array<{ delta?: { content?: string } }>;
};

async function* streamOpenAiCompatible(
  base: string,
  apiKey: string,
  modelName: string,
  system: string,
  messages: ProviderMessage[],
): AsyncGenerator<string> {
  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: modelName,
      messages: buildOpenAiMessages(system, messages),
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
    }),
  });

  if (!res.ok) {
    let message = 'AI provider error';
    try {
      const data = (await res.json()) as OpenAiResponse;
      const e = data.error;
      message = typeof e === 'string' ? e : e?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  for await (const payload of readSse(res)) {
    try {
      const json = JSON.parse(payload) as OpenAiStreamChunk;
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    } catch {
      // skip malformed chunk
    }
  }
}

export async function* streamChat(
  modelId: string,
  system: string,
  messages: ProviderMessage[],
): AsyncGenerator<string> {
  const model = resolveModel(modelId);
  const apiKey = requireKey(model);

  if (model.provider === 'gemini') {
    yield* streamGemini(apiKey, model.model, system, messages);
    return;
  }
  const base = OPENAI_COMPATIBLE_BASE[model.provider];
  if (!base) throw new Error('Unsupported provider: ' + model.provider);
  yield* streamOpenAiCompatible(base, apiKey, model.model, system, messages);
}
