import mongoose from 'mongoose';
import { normalizeCoffeeLevel, normalizeCoffeeSlug, normalizeCoffeeTags } from '@/lib/coffee-problems';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';
import type { CoffeeProblemDocument } from '@/lib/models/coffee-problem';
import type { CoffeeProblemLevel } from '@/types/coffee-problem';
import type { Problem, ProblemSummary } from '@/types/problem';

type ProblemPayload = Partial<CoffeeProblemDocument> & Record<string, unknown>;

export type ProblemInput = {
  title?: string;
  slug?: string;
  shortDescription?: string;
  fullProblemContent?: string;
  solutionContent?: string;
  difficulty?: string;
  estimatedTime?: string;
  tags?: string[] | string;
  isPublished?: boolean;
};

const DEFAULT_PROBLEM_DIFFICULTY = 'beginner';
const DEFAULT_PROBLEM_ESTIMATED_TIME = '10 min';
const PROBLEM_NUMBER_SLUG_PATTERN = /^problem-(\d+)$/i;

function getDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return '';
}

function getId(value: ProblemPayload): string {
  const rawId = value._id ?? value.id;
  if (rawId instanceof mongoose.Types.ObjectId) return rawId.toString();
  return rawId ? String(rawId) : '';
}

function isDatabaseUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /MONGODB_URI is not configured|ENOTFOUND|ECONNREFUSED|MongoServerSelectionError|buffering timed out/i.test(
    message,
  );
}

export function normalizeProblemDifficulty(value: unknown): CoffeeProblemLevel {
  return normalizeCoffeeLevel(value);
}

export function normalizeProblemSlug(title: string, slug: string): string {
  return normalizeCoffeeSlug(title, slug);
}

export function normalizeProblemTags(value: unknown): string[] {
  return normalizeCoffeeTags(value);
}

export function getNextProblemSlugFromSlugs(slugs: string[]): string {
  const maxProblemNumber = slugs.reduce((currentMax, slug) => {
    const match = PROBLEM_NUMBER_SLUG_PATTERN.exec(slug.trim());
    if (!match) return currentMax;

    const parsed = Number.parseInt(match[1] ?? '', 10);
    return Number.isFinite(parsed) ? Math.max(currentMax, parsed) : currentMax;
  }, 0);

  return `problem-${maxProblemNumber + 1}`;
}

export function buildPublishedProblemQuery() {
  return {
    $or: [{ isPublished: true }, { published: true }],
  };
}

export function findProblemByIdOrSlug(id: string) {
  if (mongoose.isValidObjectId(id)) {
    return { _id: id };
  }

  return { slug: id };
}

export function mapProblemSummary(
  payload: ProblemPayload,
  includeAdminFields = false,
): ProblemSummary {
  const difficulty = String(payload.difficulty ?? payload.level ?? 'beginner');

  return {
    id: getId(payload),
    title: String(payload.title ?? ''),
    slug: String(payload.slug ?? ''),
    shortDescription: String(payload.shortDescription ?? ''),
    difficulty: normalizeProblemDifficulty(difficulty),
    estimatedTime: String(payload.estimatedTime ?? ''),
    tags: Array.isArray(payload.tags) ? payload.tags.map(String).filter(Boolean) : [],
    ...(includeAdminFields
      ? { isPublished: Boolean(payload.isPublished ?? payload.published) }
      : {}),
    createdAt: getDateString(payload.createdAt),
    updatedAt: getDateString(payload.updatedAt),
  };
}

export function mapProblem(payload: ProblemPayload): Problem {
  return {
    ...mapProblemSummary(payload, true),
    fullProblemContent: String(
      payload.fullProblemContent ?? payload.problemStatement ?? '',
    ),
    solutionContent: String(payload.solutionContent ?? payload.solution ?? ''),
    isPublished: Boolean(payload.isPublished ?? payload.published),
  };
}

export async function getLatestPublishedProblem(): Promise<ProblemSummary | null> {
  try {
    await connectToDatabase();

    const problem = await CoffeeProblemModel.findOne(buildPublishedProblemQuery())
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return problem ? mapProblemSummary(problem) : null;
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      console.warn('Problems with Coffee is unavailable because the database is not configured or reachable.');
      return null;
    }

    throw error;
  }
}

export function normalizeProblemInput(body: ProblemInput | null) {
  const title = String(body?.title ?? '').trim();
  const slug = normalizeProblemSlug(title, String(body?.slug ?? ''));
  const shortDescription = String(body?.shortDescription ?? '').trim();
  const fullProblemContent = String(body?.fullProblemContent ?? '').trim();
  const solutionContent = String(body?.solutionContent ?? '').trim();
  const difficulty = normalizeProblemDifficulty(body?.difficulty ?? DEFAULT_PROBLEM_DIFFICULTY);
  const estimatedTime =
    String(body?.estimatedTime ?? DEFAULT_PROBLEM_ESTIMATED_TIME).trim() ||
    DEFAULT_PROBLEM_ESTIMATED_TIME;
  const tags = normalizeProblemTags(body?.tags ?? []);
  const isPublished = Boolean(body?.isPublished);

  return {
    title,
    slug,
    shortDescription,
    fullProblemContent,
    solutionContent,
    difficulty,
    estimatedTime,
    tags,
    isPublished,
    level: difficulty,
    problemStatement: fullProblemContent,
    solution: solutionContent,
    published: isPublished,
  };
}
