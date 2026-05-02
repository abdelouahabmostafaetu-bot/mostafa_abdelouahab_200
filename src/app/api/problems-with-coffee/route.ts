import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import {
  ensureSampleCoffeeProblem,
  mapCoffeeProblemSummary,
  normalizeCoffeeLevel,
  normalizeCoffeeSlug,
  normalizeCoffeeTags,
} from '@/lib/coffee-problems';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import { checkRateLimit } from '@/lib/security';
import type { CoffeeProblemLevel } from '@/types/coffee-problem';

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

function getPublicErrorDetails(error: unknown, fallbackMessage: string): {
  status: number;
  message: string;
} {
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
  const level = request.nextUrl.searchParams.get('level')?.trim().toLowerCase() ?? '';
  const tag = request.nextUrl.searchParams.get('tag')?.trim() ?? '';
  const adminMode = request.nextUrl.searchParams.get('admin') === '1';

  if (adminMode) {
    await requireAdmin();
  }

  try {
    await connectToDatabase();
    await ensureSampleCoffeeProblem();

    const query: Record<string, unknown> = adminMode ? {} : { published: true };

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { title: regex },
        { slug: regex },
        { shortDescription: regex },
        { tags: regex },
      ];
    }

    if (level && ['beginner', 'intermediate', 'advanced'].includes(level)) {
      query.level = level;
    }

    if (tag) {
      query.tags = new RegExp(`^${escapeRegex(tag)}$`, 'i');
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
          mapCoffeeProblemSummary(
            doc as Partial<Parameters<typeof mapCoffeeProblemSummary>[0]> &
              Record<string, unknown>,
            adminMode,
          ),
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
    console.error('GET /api/problems-with-coffee failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Failed to load problems.');
    if (status === 503) {
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
  const limited = checkRateLimit(request, 'coffee-problems-post', 20);
  if (limited) return limited;

  await requireAdmin();

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
          hint1?: string;
          hint2?: string;
          keyIdea?: string;
          solution?: string;
          lesson?: string;
          coverImage?: string;
          published?: boolean;
        }
      | null;

    await connectToDatabase();

    const title = String(body?.title ?? '').trim();
    const shortDescription = String(body?.shortDescription ?? '').trim();
    const estimatedTime = String(body?.estimatedTime ?? '').trim();
    const problemStatement = String(body?.problemStatement ?? '').trim();
    const slug = normalizeCoffeeSlug(title, String(body?.slug ?? ''));

    if (!title || !shortDescription || !estimatedTime || !problemStatement) {
      return NextResponse.json(
        {
          error:
            'Title, short description, estimated time, and problem statement are required.',
        },
        { status: 400 },
      );
    }

    const existing = await CoffeeProblemModel.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { error: 'Another problem already uses this slug.' },
        { status: 409 },
      );
    }

    const problem = await CoffeeProblemModel.create({
      title,
      slug,
      shortDescription,
      level: normalizeCoffeeLevel(body?.level),
      estimatedTime,
      tags: normalizeCoffeeTags(body?.tags ?? []),
      problemStatement,
      hint1: String(body?.hint1 ?? '').trim(),
      hint2: String(body?.hint2 ?? '').trim(),
      keyIdea: String(body?.keyIdea ?? '').trim(),
      solution: String(body?.solution ?? '').trim(),
      lesson: String(body?.lesson ?? '').trim(),
      coverImage: String(body?.coverImage ?? '').trim(),
      published: Boolean(body?.published),
    });

    return NextResponse.json(problem.toJSON(), { status: 201 });
  } catch (error) {
    console.error('POST /api/problems-with-coffee failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Failed to save problem.');
    return NextResponse.json({ error: message }, { status });
  }
}
