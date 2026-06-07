import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CVDataModel } from '@/lib/models/cv-data';
import { requireAdminApi } from '@/lib/admin';
import type { EducationEntry } from '@/lib/models/cv-data';

export async function GET() {
  try {
    await connectToDatabase();
    let doc = await CVDataModel.findOne();
    if (!doc) {
      doc = await CVDataModel.create({});
    }
    return NextResponse.json(doc.toJSON());
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load CV data.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = (await request.json()) as {
      researchInterests?: unknown;
      education?: unknown;
    };

    const researchInterests = Array.isArray(body.researchInterests)
      ? (body.researchInterests as string[])
          .map((s) => String(s).trim())
          .filter(Boolean)
      : undefined;

    const education = Array.isArray(body.education)
      ? (body.education as EducationEntry[]).map((e) => ({
          degree: String(e.degree ?? '').trim(),
          institution: String(e.institution ?? '').trim(),
          location: String(e.location ?? '').trim(),
          period: String(e.period ?? '').trim(),
        }))
      : undefined;

    const update: Record<string, unknown> = {};
    if (researchInterests !== undefined) update.researchInterests = researchInterests;
    if (education !== undefined) update.education = education;

    await connectToDatabase();
    const doc = await CVDataModel.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true },
    );

    return NextResponse.json(doc?.toJSON() ?? {});
  } catch (error) {
    console.error('CV update error:', error);
    return NextResponse.json({ error: 'Failed to update CV data.' }, { status: 500 });
  }
}
