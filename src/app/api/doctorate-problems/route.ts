import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';
import {
  buildDoctorateSlug,
  mapDoctorateProblemSummary,
} from '@/lib/doctorate-problems';

export const dynamic = 'force-dynamic';

const EXAM_TYPES = ['general', 'specialist'];
const DIFFICULTIES = ['easy', 'medium', 'hard', 'very-hard'];

/* ─── GET (list, public: published only — admin=1: everything) ─────────── */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10)),
    );
    const examType = searchParams.get('examType');
    const specialty = searchParams.get('specialty');
    const search = searchParams.get('search');
    const yearParam = parseInt(searchParams.get('year') || '', 10);
    const adminMode = searchParams.get('admin') === '1';

    if (adminMode) {
      const adminResponse = await requireAdminApi();
      if (adminResponse) return adminResponse;
    }

    await connectToDatabase();

    const query: Record<string, unknown> = adminMode
      ? {}
      : { published: true };
    if (examType && EXAM_TYPES.includes(examType)) query.examType = examType;
    if (specialty) query.specialty = specialty;
    if (Number.isFinite(yearParam)) query.year = yearParam;
    if (search) query.$text = { $search: search };

    const skip = (page - 1) * limit;
    const total = await DoctorateProblem.countDocuments(query);
    const problems = await DoctorateProblem.find(query)
      .sort({ year: -1, problemNumber: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: problems.map(mapDoctorateProblemSummary),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Doctorate problems GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch doctorate problems' },
      { status: 500 },
    );
  }
}

/* ─── POST (create — admin only) ───────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(
      request,
      'doctorate-problems:create',
      10,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const adminResponse = await requireAdminApi();
    if (adminResponse) return adminResponse;

    await connectToDatabase();

    const body = (await request.json()) as Record<string, unknown>;
    const {
      title,
      examType,
      specialty,
      year,
      university,
      source,
      problemNumber,
      statement,
      solution,
      tags,
      difficulty,
      published,
    } = body;

    const titleStr = String(title ?? '').trim();
    const statementStr = String(statement ?? '').trim();
    const yearNum = Number(year);

    if (!titleStr || !statementStr) {
      return NextResponse.json(
        { success: false, error: 'Title and problem statement are required' },
        { status: 400 },
      );
    }
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

    const slug = buildDoctorateSlug(yearNum, String(examType), titleStr);
    const existing = await DoctorateProblem.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A problem with this title already exists for this exam and year',
        },
        { status: 400 },
      );
    }

    const problemNumberNum = Number(problemNumber);

    const problem = new DoctorateProblem({
      title: titleStr,
      slug,
      examType,
      specialty: String(specialty ?? '').trim() || 'Mathematics',
      year: yearNum,
      university: String(university ?? '').trim(),
      source: String(source ?? '').trim(),
      problemNumber:
        Number.isInteger(problemNumberNum) && problemNumberNum > 0
          ? problemNumberNum
          : undefined,
      statement: statementStr,
      solution: String(solution ?? '').trim(),
      tags: Array.isArray(tags)
        ? (tags as string[])
            .filter((t) => typeof t === 'string')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 12)
        : [],
      difficulty: DIFFICULTIES.includes(String(difficulty))
        ? difficulty
        : 'medium',
      published: published === undefined ? true : Boolean(published),
    });

    await problem.save();

    return NextResponse.json(
      {
        success: true,
        data: { ...problem.toObject(), id: String(problem._id), _id: undefined },
      },
      { status: 201 },
    );
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'Failed to create problem';
    console.error('Doctorate problems POST error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
