import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import AiModelConfigModel from '@/lib/models/ai-model-config';
import { getBuiltinModels } from '@/lib/ai/model-catalog';
import { requireAdminApi } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_PROVIDERS = ['gemini', 'openrouter', 'mistral', 'openai', 'custom'];

type AdminModelRow = {
  id: string;
  label: string;
  provider: string;
  model: string;
  envKey: string;
  baseUrl: string;
  vision: boolean;
  reasoning: boolean;
  custom: boolean;
  keySet: boolean;
  docId: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function GET() {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const builtin: AdminModelRow[] = getBuiltinModels().map((m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    model: m.model,
    envKey: m.envKey,
    baseUrl: '',
    vision: Boolean(m.vision),
    reasoning: Boolean(m.reasoning),
    custom: false,
    keySet: Boolean(process.env[m.envKey]),
    docId: '',
  }));

  let custom: AdminModelRow[] = [];
  try {
    await connectToDatabase();
    const docs = await AiModelConfigModel.find({}).sort({ createdAt: -1 });
    custom = docs.map((doc) => {
      const j = doc.toJSON() as Record<string, unknown>;
      const envKey = String(j.envKey ?? '');
      return {
        id: String(j.modelId ?? ''),
        label: String(j.label ?? ''),
        provider: String(j.provider ?? ''),
        model: String(j.model ?? ''),
        envKey,
        baseUrl: String(j.baseUrl ?? ''),
        vision: Boolean(j.vision),
        reasoning: Boolean(j.reasoning),
        custom: true,
        keySet: Boolean(process.env[envKey]),
        docId: String(j.id ?? ''),
      };
    });
  } catch {
    custom = [];
  }

  return NextResponse.json({ models: [...builtin, ...custom] });
}

export async function POST(request: NextRequest) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const label = String(body.label ?? '').trim();
  const provider = String(body.provider ?? '').trim().toLowerCase();
  const model = String(body.model ?? '').trim();
  const envKey = String(body.envKey ?? '').trim();
  const baseUrl = String(body.baseUrl ?? '').trim();
  const vision = Boolean(body.vision);
  const reasoning = Boolean(body.reasoning);

  if (!label || !model || !envKey) {
    return NextResponse.json(
      { error: 'Please fill in the display name, the model name, and the key name.' },
      { status: 400 },
    );
  }
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Choose a valid provider.' }, { status: 400 });
  }
  if (provider === 'custom' && !baseUrl) {
    return NextResponse.json(
      { error: 'A custom provider needs a base URL (an OpenAI-compatible endpoint).' },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const base = slugify(label) || 'model';
    let modelId = 'custom-' + base;
    let n = 1;
    while (await AiModelConfigModel.findOne({ modelId })) {
      n += 1;
      modelId = 'custom-' + base + '-' + n;
    }
    const now = new Date().toISOString();
    const doc = await AiModelConfigModel.create({
      modelId,
      label,
      provider,
      model,
      envKey,
      baseUrl,
      vision,
      reasoning,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ ok: true, id: modelId, docId: String(doc._id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add model.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const id = String(body.id ?? '');
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid model id.' }, { status: 400 });
  }
  try {
    await connectToDatabase();
    const doc = await AiModelConfigModel.findById(id);
    if (!doc) return NextResponse.json({ error: 'Model not found.' }, { status: 404 });
    await doc.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove model.' },
      { status: 500 },
    );
  }
}
