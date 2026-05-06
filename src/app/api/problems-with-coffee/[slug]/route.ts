import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import {
  mapCoffeeProblem,
  normalizeCoffeeLevel,
  normalizeCoffeeSlug,
  normalizeCoffeeTags,
} from '@/lib/coffee-problems';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import { checkRateLimit, getUnknownFields, isPlainObject, jsonError } from '@/lib/security';
import type { CoffeeProblemLevel } from '@/types/coffee-problem';

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const adminMode = request.nextUrl.searchParams.get('admin') === '1';

  if (adminMode) {
    const forbidden = await requireAdminApi();
    if (forbidden) return forbidden;
  }

  try {
    await connectToDatabase();

    const problem = await CoffeeProblemModel.findOne({
      slug,
      ...(adminMode ? {} : { published: true }),
    }).lean();

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found.' }, { status: 404 });
    }

    return NextResponse.json(
      mapCoffeeProblem(
        problem as Partial<Parameters<typeof mapCoffeeProblem>[0]> &
          Record<string, unknown>,
      ),
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /api/problems-with-coffee/[slug] failed:', error);
    return NextResponse.json({ error: 'Failed to load problem.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const limited = checkRateLimit(request, 'coffee-problems-put', 30);
  if (limited) return limited;

  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          title?: string;
          slug?: string;
          shortDescription?: string;
          level?: CoffeeProblemLevel;
          estimatedTime?: string;
          tags?: string[] | string;
          problemStatement?: string;
          fullProblemContent?: string;
          hint1?: string;
          hint2?: string;
          keyIdea?: string;
          solution?: string;
          solutionContent?: string;
          lesson?: string;
          coverImage?: string;
          published?: boolean;
          isPublished?: boolean;
          difficulty?: string;
        }
      | null;

    if (!isPlainObject(body)) {
      return jsonError('Request body must be a JSON object.', 400);
    }

    const unknownFields = getUnknownFields(body, [
      'title',
      'slug',
      'shortDescription',
      'level',
      'difficulty',
      'estimatedTime',
      'tags',
      'problemStatement',
      'fullProblemContent',
      'hint1',
      'hint2',
      'keyIdea',
      'solution',
      'solutionContent',
      'lesson',
      'coverImage',
      'published',
      'isPublished',
    ]);
    if (unknownFields.length > 0) {
      return jsonError(`Unknown field: ${unknownFields[0]}.`, 400);
    }

    await connectToDatabase();

    const { slug: currentSlug } = await context.params;
    const problem = await CoffeeProblemModel.findOne({ slug: currentSlug });

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found.' }, { status: 404 });
    }

    const title = String(body?.title ?? '').trim();
    const shortDescription = String(body?.shortDescription ?? '').trim();
    const estimatedTime = String(body?.estimatedTime ?? '').trim();
    const problemStatement = String(body?.problemStatement ?? body?.fullProblemContent ?? '').trim();
    const nextSlug = normalizeCoffeeSlug(title, String(body?.slug ?? ''));

    if (!title || !shortDescription || !estimatedTime || !problemStatement) {
      return NextResponse.json(
        {
          error:
            'Title, short description, estimated time, and problem statement are required.',
        },
        { status: 400 },
      );
    }

    const existing = await CoffeeProblemModel.findOne({
      slug: nextSlug,
      _id: { $ne: problem._id },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Another problem already uses this slug.' },
        { status: 409 },
      );
    }

    problem.title = title;
    problem.slug = nextSlug;
    problem.shortDescription = shortDescription;
    problem.level = normalizeCoffeeLevel(body?.level);
    problem.estimatedTime = estimatedTime;
    problem.tags = normalizeCoffeeTags(body?.tags ?? []);
    problem.problemStatement = problemStatement;
    problem.hint1 = String(body?.hint1 ?? '').trim();
    problem.hint2 = String(body?.hint2 ?? '').trim();
    problem.keyIdea = String(body?.keyIdea ?? '').trim();
    problem.solution = String(body?.solution ?? body?.solutionContent ?? '').trim();
    problem.lesson = String(body?.lesson ?? '').trim();
    problem.coverImage = String(body?.coverImage ?? '').trim();
    problem.published = Boolean(body?.published ?? body?.isPublished);

    await problem.save();

    return NextResponse.json(problem.toJSON(), { status: 200 });
  } catch (error) {
    console.error('PUT /api/problems-with-coffee/[slug] failed:', error);
    return NextResponse.json({ error: 'Failed to update problem.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const limited = checkRateLimit(request, 'coffee-problems-delete', 30);
  if (limited) return limited;

  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  try {
    await connectToDatabase();

    const { slug } = await context.params;
    const problem = await CoffeeProblemModel.findOne({ slug });

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found.' }, { status: 404 });
    }

    await problem.deleteOne();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/problems-with-coffee/[slug] failed:', error);
    return NextResponse.json({ error: 'Failed to delete problem.' }, { status: 500 });
  }
}
