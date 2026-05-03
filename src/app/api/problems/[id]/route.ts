import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import {
  buildPublishedProblemQuery,
  findProblemByIdOrSlug,
  mapProblem,
  normalizeProblemInput,
} from '@/lib/problems';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import { checkRateLimit } from '@/lib/security';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const adminMode = request.nextUrl.searchParams.get('admin') === '1';

  if (adminMode) {
    await requireAdmin();
  }

  try {
    await connectToDatabase();

    const problem = await CoffeeProblemModel.findOne({
      ...findProblemByIdOrSlug(id),
      ...(adminMode ? {} : buildPublishedProblemQuery()),
    }).lean();

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found.' }, { status: 404 });
    }

    return NextResponse.json(mapProblem(problem), { status: 200 });
  } catch (error) {
    console.error('GET /api/problems/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to load problem.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const limited = checkRateLimit(request, 'problems-put', 30);
  if (limited) return limited;

  await requireAdmin();

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as Parameters<
      typeof normalizeProblemInput
    >[0];
    const problemInput = normalizeProblemInput(body);

    if (
      !problemInput.title ||
      !problemInput.shortDescription ||
      !problemInput.fullProblemContent
    ) {
      return NextResponse.json(
        {
          error:
            'Title, short description, and full problem content are required.',
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const problem = await CoffeeProblemModel.findOne(findProblemByIdOrSlug(id));
    if (!problem) {
      return NextResponse.json({ error: 'Problem not found.' }, { status: 404 });
    }

    const hasRequestedSlug = typeof body?.slug === 'string' && body.slug.trim().length > 0;
    if (hasRequestedSlug && problemInput.slug !== problem.slug) {
      const existingProblem = await CoffeeProblemModel.findOne({
        slug: problemInput.slug,
        _id: { $ne: problem._id },
      }).lean();

      if (existingProblem) {
        return NextResponse.json(
          { error: 'Another problem already uses this slug.' },
          { status: 409 },
        );
      }
    }

    problem.title = problemInput.title;
    if (hasRequestedSlug) {
      problem.slug = problemInput.slug;
    }
    problem.shortDescription = problemInput.shortDescription;
    problem.difficulty = problemInput.difficulty;
    problem.level = problemInput.level;
    problem.estimatedTime = problemInput.estimatedTime;
    problem.tags = problemInput.tags;
    problem.fullProblemContent = problemInput.fullProblemContent;
    problem.problemStatement = problemInput.problemStatement;
    problem.solutionContent = problemInput.solutionContent;
    problem.solution = problemInput.solution;
    problem.isPublished = problemInput.isPublished;
    problem.published = problemInput.published;

    await problem.save();

    return NextResponse.json(mapProblem(problem.toJSON()), { status: 200 });
  } catch (error) {
    console.error('PUT /api/problems/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update problem.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const limited = checkRateLimit(request, 'problems-delete', 30);
  if (limited) return limited;

  await requireAdmin();

  try {
    const { id } = await context.params;
    await connectToDatabase();

    const problem = await CoffeeProblemModel.findOne(findProblemByIdOrSlug(id));
    if (!problem) {
      return NextResponse.json({ error: 'Problem not found.' }, { status: 404 });
    }

    await problem.deleteOne();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/problems/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete problem.' }, { status: 500 });
  }
}
