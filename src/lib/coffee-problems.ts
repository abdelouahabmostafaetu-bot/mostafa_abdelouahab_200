import type {
  CoffeeProblem,
  CoffeeProblemLevel,
  CoffeeProblemSummary,
} from '@/types/coffee-problem';
import { type CoffeeProblemDocument } from '@/lib/models/coffee-problem';

export const COFFEE_PROBLEM_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

function getDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return '';
}

export function normalizeCoffeeSlug(title: string, value: string): string {
  const source = value.trim() || title.trim();
  const slug = source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

  return slug || 'problem';
}

export function normalizeCoffeeTags(value: unknown): string[] {
  const rawTags = Array.isArray(value) ? value : String(value ?? '').split(',');
  const seen = new Set<string>();

  return rawTags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

export function normalizeCoffeeLevel(value: unknown): CoffeeProblemLevel {
  const level = String(value ?? '').toLowerCase();
  return COFFEE_PROBLEM_LEVELS.includes(level as CoffeeProblemLevel)
    ? (level as CoffeeProblemLevel)
    : 'beginner';
}

export function mapCoffeeProblemSummary(
  payload: Partial<CoffeeProblemDocument> & Record<string, unknown>,
  includeAdminFields = false,
): CoffeeProblemSummary {
  return {
    title: String(payload.title ?? ''),
    slug: String(payload.slug ?? ''),
    shortDescription: String(payload.shortDescription ?? ''),
    level: normalizeCoffeeLevel(payload.level),
    difficulty: String(payload.difficulty ?? ''),
    estimatedTime: String(payload.estimatedTime ?? ''),
    tags: Array.isArray(payload.tags) ? payload.tags.map(String).filter(Boolean) : [],
    coverImage: String(payload.coverImage ?? ''),
    ...(includeAdminFields ? { published: Boolean(payload.published), isPublished: Boolean(payload.isPublished) } : {}),
    createdAt: getDateString(payload.createdAt),
    updatedAt: getDateString(payload.updatedAt),
  };
}

export function mapCoffeeProblem(
  payload: Partial<CoffeeProblemDocument> & Record<string, unknown>,
): CoffeeProblem {
  return {
    ...mapCoffeeProblemSummary(payload, true),
    problemStatement: String(payload.problemStatement ?? ''),
    hint1: String(payload.hint1 ?? ''),
    hint2: String(payload.hint2 ?? ''),
    keyIdea: String(payload.keyIdea ?? ''),
    solution: String(payload.solution ?? ''),
    lesson: String(payload.lesson ?? ''),
    fullProblemContent: String(payload.fullProblemContent ?? ''),
    solutionContent: String(payload.solutionContent ?? ''),
    published: Boolean(payload.published),
    isPublished: Boolean(payload.isPublished),
  };
}
