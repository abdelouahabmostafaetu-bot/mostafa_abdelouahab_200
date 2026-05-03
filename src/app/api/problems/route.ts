import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import {
  buildPublishedProblemQuery,
  mapProblem,
  mapProblemSummary,
  normalizeProblemInput,
} from '@/lib/problems';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LIMIT = 50;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBoundedPositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function getPublicErrorDetails(error: unknown, fallbackMessage: string) {
  const rawMessage = error instanceof Error ? error.message : '';
  const isMissingMongoUri = rawMessage.includes('MONGODB_URI is not configured');
  const isDatabaseConnectionIssue =
    /ENOTFOUND|ECONNREFUSED|MongoServerSelectionError|buffering timed out/i.test(rawMessage);

  if (isMissingMongoUri) {
    return {
      status: 503,
      message: 'Server configuration is incomplete. MONGODB_URI is missing.',
    };
  }

  if (isDatabaseConnectionIssue) {
    return {
      status: 503,
      message: 'Database connection failed. Check MongoDB URI and Atlas network access.',
    };
  }

  return {
    status: 500,
    message: fallbackMessage,
  };
}

export async function GET(request: NextRequest) {
  const page = getBoundedPositiveInt(request.nextUrl.searchParams.get('page'), 1, 10_000);
  const limit = getBoundedPositiveInt(request.nextUrl.searchParams.get('limit'), MAX_LIMIT, MAX_LIMIT);
  const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
  const adminMode = request.nextUrl.searchParams.get('admin') === '1';

  if (adminMode) {
    await requireAdmin();
  }

  try {
    await connectToDatabase();

    const query: Record<string, unknown> = adminMode ? {} : buildPublishedProblemQuery();

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$and = [
        ...(Array.isArray(query.$and) ? query.$and : []),
        {
          $or: [
            { title: regex },
            { slug: regex },
            { shortDescription: regex },
            { tags: regex },
          ],
        },
      ];
    }

    const [docs, totalProblems] = await Promise.all([
      CoffeeProblemModel.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CoffeeProblemModel.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalProblems / limit));

    return NextResponse.json(
      {
        problems: docs.map((doc) =>
          adminMode ? mapProblem(doc) : mapProblemSummary(doc),
        ),
        pagination: {
          page,
          limit,
          totalProblems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /api/problems failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Failed to load problems.');

    if (!adminMode && status === 503) {
      return NextResponse.json(
        {
          problems: [],
          pagination: {
            page,
            limit,
            totalProblems: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          warning: message,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 'problems-post', 20);
  if (limited) return limited;

  await requireAdmin();

  try {
    const body = (await request.json().catch(() => null)) as Parameters<
      typeof normalizeProblemInput
    >[0];
    const problemInput = normalizeProblemInput(body);

    if (
      !problemInput.title ||
      !problemInput.slug ||
      !problemInput.shortDescription ||
      !problemInput.fullProblemContent ||
      !problemInput.estimatedTime
    ) {
      return NextResponse.json(
        {
          error:
            'Title, slug, short description, full problem content, and estimated time are required.',
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existing = await CoffeeProblemModel.findOne({ slug: problemInput.slug });
    if (existing) {
      return NextResponse.json(
        { error: 'Another problem already uses this slug.' },
        { status: 409 },
      );
    }

    const problem = await CoffeeProblemModel.create({
      ...problemInput,
      hint1: '',
      hint2: '',
      keyIdea: '',
      lesson: '',
      coverImage: '',
    });

    return NextResponse.json(mapProblem(problem.toJSON()), { status: 201 });
  } catch (error) {
    console.error('POST /api/problems failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Failed to save problem.');
    return NextResponse.json({ error: message }, { status });
  }
}
