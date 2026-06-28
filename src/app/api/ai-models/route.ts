import { NextResponse } from 'next/server';
import { getAllModels, toSafeModel } from '@/lib/ai/model-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Returns the safe model list (built-in + custom) for the model pickers.
// Contains NO secrets — only id, label, and capability flags.
export async function GET() {
  try {
    const models = await getAllModels();
    return NextResponse.json({ models: models.map(toSafeModel) });
  } catch {
    return NextResponse.json({ models: [] });
  }
}
