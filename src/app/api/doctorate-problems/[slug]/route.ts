import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';
import {
  buildDoctorateSlug,
  mapDoctorateProblemDetail,
} from '@/lib/doctorate-problems';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

const EXAM_TYPES = ['general', 'specialist'];
const DIFFICULTIES = ['easy', 'medium', 'hard', 'very-hard'];

/* ─── GET (public: published only — admin=1: any) ──────────────────────── */

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const adminMode = request.nextUrl.searchParams.get('admin') === '1';

    if (adminMode) {
      const adminResponse = await requireAdminApi();
      if (adminResponse) return adminResponse;
    }

    await connectToDatabase();

    const query: Record<string, unknown> = adminMode
      ? { slug }
      : { slug, published: true };
    const problem = await DoctorateProblem.findOne(query).lean();
    if (!problem) {
      return NextResponse.json(
        { success: false, error: 'Problem not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: mapDoctorateProblemDetail(problem),
    });
  } catch (error) {
    console.error('Doctorate problem GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch problem' },
      { status: 500 },
    );
  }
}

/* ─── PUT (update — admin only) ────────────────────────────────────────── */

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const rateLimitResponse = checkRateLimit(
      request,
      'doctorate-problems:update',
      15,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const adminResponse = await requireAdminApi();
    if (adminResponse) return adminResponse;

    await connectToDatabase();

    const problem = await DoctorateProblem.findOne({ slug });
    if (!problem) {
      return NextResponse.json(
        { success: false, error: 'Problem not found' },
        { status: 404 },
      );
    }

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

    if (typeof title === 'string' && title.trim()) {
      problem.title = title.trim();
    }
    if (typeof examType === 'string' && EXAM_TYPES.includes(examType)) {
      problem.examType = examType as 'general' | 'specialist';
    }
    if (typeof specialty === 'string' && specialty.trim()) {
      problem.specialty = specialty.trim();
    }
    const yearNum = Number(year);
    if (Number.isInteger(yearNum) && yearNum >= 1990 && yearNum <= 2100) {
      problem.year = yearNum;
    }
    if (typeof university === 'string') problem.university = university.trim();
    if (typeof source === 'string') problem.source = source.trim();
    if (problemNumber === null || problemNumber === '') {
      problem.problemNumber = undefined;
    } else {
      const pn = Number(problemNumber);
      if (Number.isInteger(pn) && pn > 0 && pn < 100) {
        problem.problemNumber = pn;
      }
    }
    if (typeof statement === 'string' && statement.trim()) {
      problem.statement = statement.trim();
    }
    if (typeof solution === 'string') problem.solution = solution.trim();
    if (typeof difficulty === 'string' && DIFFICULTIES.includes(difficulty)) {
      problem.difficulty = difficulty as
        | 'easy'
        | 'medium'
        | 'hard'
        | 'very-hard';
    }
    if (typeof published === 'boolean') problem.published = published;
    if (Array.isArray(tags)) {
      problem.tags = (tags as string[])
        .filter((t) => typeof t === 'string')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12);
    }

    /* Keep the slug in sync with year + exam type + title */
    const newSlug = buildDoctorateSlug(
      problem.year,
      problem.examType,
      problem.title,
    );
    if (newSlug !== problem.slug) {
      const conflict = await DoctorateProblem.findOne({ slug: newSlug });
      if (conflict && String(conflict._id) !== String(problem._id)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'A problem with this title already exists for this exam and year',
          },
          { status: 400 },
        );
      }
      problem.slug = newSlug;
    }

    await problem.save();

    return NextResponse.json({
      success: true,
      data: { ...problem.toObject(), id: String(problem._id), _id: undefined },
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'Failed to update problem';
    console.error('Doctorate problem PUT error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* ─── DELETE (admin only) ──────────────────────────────────────────────── */

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const rateLimitResponse = checkRateLimit(
      request,
      'doctorate-problems:delete',
      10,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const adminResponse = await requireAdminApi();
    if (adminResponse) return adminResponse;

    await connectToDatabase();

    const result = await DoctorateProblem.deleteOne({ slug });
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Problem not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Problem deleted successfully',
    });
  } catch (error) {
    console.error('Doctorate problem DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete problem' },
      { status: 500 },
    );
  }
}
