/**
 * Catalog of AI models the user can choose from in the Math AI.
 * SAFE for the browser: contains NO secrets, only labels and the NAME of the
 * environment variable each provider needs.
 *
 * Only strong mathematics models are listed here. Weak models were removed on
 * purpose so every choice gives good, reliable math.
 *
 * Admins can add MORE models at runtime from the Admin AI; those are stored in
 * the database (see lib/ai/model-catalog.ts) and merged with this list.
 *
 * vision:    model can read uploaded images (photos of problems). Images are
 *            read first by a free vision model (Qwen2.5-VL), with Gemini as an
 *            automatic backup if it is unavailable.
 * reasoning: model "thinks" step by step before answering — best for hard,
 *            advanced math (slower, but much more accurate).
 */

export type AiProvider = 'gemini' | 'openrouter' | 'mistral' | 'openai' | 'nara' | 'custom';

export type AiModel = {
  id: string;
  label: string;
  provider: AiProvider;
  model: string;
  envKey: string;
  vision?: boolean;
  reasoning?: boolean;
};

export const AI_MODELS: AiModel[] = [
  {
    id: 'gemini-flash',
    label: 'Gemini 2.5 Flash — fast & reliable (reads images)',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    envKey: 'GEMINI_API_KEY',
    vision: true,
  },
  {
    id: 'nara-claude-sonnet',
    label: 'Claude Sonnet 4.5 — top-tier reasoning (via NaraRouter)',
    provider: 'nara',
    model: 'claude-sonnet-4.5',
    envKey: 'claudesonnet4',
    vision: true,
    reasoning: true,
  },
  {
    id: 'openrouter-vision',
    label: 'Qwen2.5-VL — reads photos of problems (free)',
    provider: 'openrouter',
    model: 'qwen/qwen2.5-vl-72b-instruct:free',
    envKey: 'OPENROUTER_API_KEY',
    vision: true,
  },
  {
    id: 'openrouter-deepseek-r1',
    label: 'DeepSeek R1 — deep reasoning (best for hard math)',
    provider: 'openrouter',
    model: 'deepseek/deepseek-r1',
    envKey: 'OPENROUTER_API_KEY',
    reasoning: true,
  },
  {
    id: 'openrouter-qwq',
    label: 'Qwen QwQ 32B — step-by-step reasoning',
    provider: 'openrouter',
    model: 'qwen/qwq-32b',
    envKey: 'OPENROUTER_API_KEY',
    reasoning: true,
  },
  {
    id: 'openrouter-deepseek',
    label: 'DeepSeek V3 — strong & fast',
    provider: 'openrouter',
    model: 'deepseek/deepseek-chat',
    envKey: 'OPENROUTER_API_KEY',
  },
  {
    id: 'mistral-large',
    label: 'Mistral Large — strong all-round',
    provider: 'mistral',
    model: 'mistral-large-latest',
    envKey: 'MISTRAL_API_KEY',
  },
  {
    id: 'openai-gpt',
    label: 'GPT-4o (OpenAI)',
    provider: 'openai',
    model: 'gpt-4o',
    envKey: 'OPENAI_API_KEY',
  },
];

export const DEFAULT_MODEL_ID = 'gemini-flash';
// Free vision model tried first for image problems.
export const PRIMARY_VISION_MODEL_ID = 'openrouter-vision';
// Automatic backup if the free vision model is unavailable.
export const VISION_FALLBACK_MODEL_ID = 'gemini-flash';
