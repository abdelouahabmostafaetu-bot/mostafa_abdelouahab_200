/**
 * Catalog of AI models the user can choose from in the Math AI.
 * This file is SAFE for the browser: it contains NO secrets, only labels and
 * the NAME of the environment variable each provider needs.
 *
 * To enable a model, add its API key in Vercel under the listed envKey.
 * To add a new model, add a row here and (if it is a new provider) a base URL
 * in src/lib/ai/providers.ts.
 */

export type AiProvider =
  | 'gemini'
  | 'groq'
  | 'cerebras'
  | 'openrouter'
  | 'mistral'
  | 'nvidia'
  | 'openai';

export type AiModel = {
  id: string;
  label: string;
  provider: AiProvider;
  model: string;
  envKey: string;
};

export const AI_MODELS: AiModel[] = [
  {
    id: 'gemini-flash',
    label: 'Gemini 2.5 Flash (Google)',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    envKey: 'GEMINI_API_KEY',
  },
  {
    id: 'groq-llama',
    label: 'Llama 3.3 70B (Groq, very fast)',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    envKey: 'GROQ_API_KEY',
  },
  {
    id: 'cerebras-llama',
    label: 'Llama 3.3 70B (Cerebras, very fast)',
    provider: 'cerebras',
    model: 'llama-3.3-70b',
    envKey: 'CEREBRAS_API_KEY',
  },
  {
    id: 'openrouter-deepseek',
    label: 'DeepSeek V3 (OpenRouter)',
    provider: 'openrouter',
    model: 'deepseek/deepseek-chat',
    envKey: 'OPENROUTER_API_KEY',
  },
  {
    id: 'mistral-large',
    label: 'Mistral Large',
    provider: 'mistral',
    model: 'mistral-large-latest',
    envKey: 'MISTRAL_API_KEY',
  },
  {
    id: 'nvidia-nemotron',
    label: 'Nemotron 70B (NVIDIA)',
    provider: 'nvidia',
    model: 'nvidia/llama-3.1-nemotron-70b-instruct',
    envKey: 'NVIDIA_API_KEY',
  },
  {
    id: 'openai-gpt',
    label: 'GPT-4o mini (OpenAI)',
    provider: 'openai',
    model: 'gpt-4o-mini',
    envKey: 'OPENAI_API_KEY',
  },
];

export const DEFAULT_MODEL_ID = 'gemini-flash';
