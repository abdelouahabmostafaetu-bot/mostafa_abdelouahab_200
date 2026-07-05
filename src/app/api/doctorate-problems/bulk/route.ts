import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';
import { buildDoctorateSlug } from '@/lib/doctorate-problems';

export const dynamic = 'force-dynamic';

const EXAM_TYPES = ['general', 'specialist'];
const DIFFICULTIES = ['easy', 'medium', 'hard', 'very-hard'];
const MAX_PROBLEMS = 15;

/**
 * POST /api/doctorate-problems/bulk — create a full exam at once.
 * Body: { examType, year, specialty, university, source, problems: [
 *   { title, problemNumber?, difficulty?, tags?, statement, solution? }
 * ] }
 * Admin only. The whole batch is validated first; nothing is saved
 * unless every problem is valid.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(
      request,
      'doctorate-problems:bulk',
      5,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const adminResponse = await requireAdminApi();
    if (adminResponse) return adminResponse;

    await connectToDatabase();

    const body = (await request.json()) as Record<string, unknown>;
    const { examType, year, specialty, university, source, problems } = body;

    const yearNum = Number(year);
    if (!EXAM_TYPES.includes(String(examType))) {
      return NextResponse.json(
        { success: false, error: 'Exam type must be general or specialist' },
        { status: 400 },
      );
    }
    if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > 2100) {
      return NextResponse.json(
        { success: false, error: 'A valid exam year is required' },
        { status: 400 },
      );
    }
    if (!Array.isArray(problems) || problems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one problem is required' },
        { status: 400 },
      );
    }
    if (problems.length > MAX_PROBLEMS) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_PROBLEMS} problems per exam upload`,
        },
        { status: 400 },
      );
    }

    const specialtyStr = String(specialty ?? '').trim() || 'Mathematics';
    const universityStr = String(university ?? '').trim();
    const sourceStr = String(source ?? '').trim();

    /* Validate every problem before saving anything */
    const docs: Array<Record<string, unknown>> = [];
    const slugs: string[] = [];

    for (let i = 0; i < problems.length; i += 1) {
      const p = problems[i] as Record<string, unknown>;
      const label = `Problem ${i + 1}`;

      const titleStr = String(p?.title ?? '').trim();
      const statementStr = String(p?.statement ?? '').trim();

      if (!titleStr) {
        return NextResponse.json(
          { success: false, error: `${label}: title is required` },
          { status: 400 },
        );
      }
      if (titleStr.length < 3 || titleStr.length > 250) {
        return NextResponse.json(
          {
            success: false,
            error: `${label}: title must be between 3 and 250 characters`,
          },
          { status: 400 },
        );
      }
      if (!statementStr || statementStr.length < 10) {
        return NextResponse.json(
          {
            success: false,
            error: `${label}: the problem statement is required (min 10 characters)`,
          },
          { status: 400 },
        );
      }

      const slug = buildDoctorateSlug(yearNum, String(examType), titleStr);
      if (slugs.includes(slug)) {
        return NextResponse.json(
          {
            success: false,
            error: `${label}: duplicate title within this exam ("${titleStr}")`,
          },
          { status: 400 },
        );
      }
      slugs.push(slug);

      const pnRaw = Number(p?.problemNumber);
      const problemNumber =
        Number.isInteger(pnRaw) && pnRaw > 0 && pnRaw < 100 ? pnRaw : i + 1;

      docs.push({
        title: titleStr,
        slug,
        examType,
        specialty: specialtyStr,
        year: yearNum,
        university: universityStr,
        source: sourceStr,
        problemNumber,
        statement: statementStr,
        solution: String(p?.solution ?? '').trim(),
        tags: Array.isArray(p?.tags)
          ? (p.tags as string[])
              .filter((t) => typeof t === 'string')
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 12)
          : [],
        difficulty: DIFFICULTIES.includes(String(p?.difficulty))
          ? p.difficulty
          : 'medium',
        published: true,
      });
    }

    /* Check for conflicts with already-existing problems */
    const existing = await DoctorateProblem.find({ slug: { $in: slugs } })
      .select('slug title')
      .lean();
    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Already in the archive: "${existing[0].title}". Edit or remove it first.`,
        },
        { status: 400 },
      );
    }

    const created = await DoctorateProblem.insertMany(docs, {
      ordered: true,
    });

    return NextResponse.json(
      {
        success: true,
        created: created.length,
        slugs,
      },
      { status: 201 },
    );
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'Failed to create exam';
    console.error('Doctorate problems BULK POST error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
