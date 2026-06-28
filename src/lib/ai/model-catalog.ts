/**
 * Server-side catalog that merges the built-in models (models.ts) with the
 * custom models the admin added (stored in MongoDB). Used to resolve a model
 * id to its full config and to list models for the pickers.
 *
 * Custom models never store the API key itself — only the env var name. The key
 * lives in Vercel environment variables, exactly like the built-in models.
 */

import { AI_MODELS, type AiModel, type AiProvider } from './models';
import { connectToDatabase } from '@/lib/mongodb';
import AiModelConfigModel from '@/lib/models/ai-model-config';

export type CatalogModel = AiModel & { custom: boolean; baseUrl?: string };

export type SafeModel = {
  id: string;
  label: string;
  vision: boolean;
  reasoning: boolean;
  custom: boolean;
};

const BUILTIN: CatalogModel[] = AI_MODELS.map((m) => ({ ...m, custom: false }));

function toCatalog(doc: Record<string, unknown>): CatalogModel {
  return {
    id: String(doc.modelId ?? ''),
    label: String(doc.label ?? ''),
    provider: String(doc.provider ?? 'openai') as AiProvider,
    model: String(doc.model ?? ''),
    envKey: String(doc.envKey ?? ''),
    vision: Boolean(doc.vision),
    reasoning: Boolean(doc.reasoning),
    custom: true,
    baseUrl: String(doc.baseUrl ?? ''),
  };
}

export function getBuiltinModels(): CatalogModel[] {
  return BUILTIN;
}

export async function getCustomModels(): Promise<CatalogModel[]> {
  try {
    await connectToDatabase();
    const docs = await AiModelConfigModel.find({}).sort({ createdAt: -1 });
    return docs.map((d) => toCatalog(d.toJSON() as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function getAllModels(): Promise<CatalogModel[]> {
  const custom = await getCustomModels();
  return [...BUILTIN, ...custom];
}

export async function resolveCatalogModel(id: string): Promise<CatalogModel | undefined> {
  const builtin = BUILTIN.find((m) => m.id === id);
  if (builtin) return builtin;
  const custom = await getCustomModels();
  return custom.find((m) => m.id === id);
}

export function toSafeModel(m: CatalogModel): SafeModel {
  return {
    id: m.id,
    label: m.label,
    vision: Boolean(m.vision),
    reasoning: Boolean(m.reasoning),
    custom: m.custom,
  };
}
