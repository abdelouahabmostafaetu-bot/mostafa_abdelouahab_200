import type {
  CoffeeProblem,
  CoffeeProblemLevel,
  CoffeeProblemSummary,
} from '@/types/coffee-problem';
import CoffeeProblemModel, {
  type CoffeeProblemDocument,
} from '@/lib/models/coffee-problem';

export const COFFEE_PROBLEM_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const SAMPLE_COFFEE_PROBLEM = {
  title: 'The Circle and the Extra Meter',
  slug: 'circle-extra-meter',
  shortDescription:
    'A surprising problem about a rope around a circle and why the answer does not depend on the circle’s size.',
  level: 'beginner' as CoffeeProblemLevel,
  estimatedTime: '10 min',
  tags: ['pi', 'circle', 'geometry', 'radius'],
  problemStatement: `A rope is placed exactly around a circular garden of radius $r$.

The circumference is:

$$
C = 2\\pi r
$$

Then the rope is made 1 meter longer and lifted equally around the circle.

If the new radius is $r+h$, find the height $h$.`,
  hint1: 'Write the new circumference in two different ways.',
  hint2: `The new circumference is:

$$
2\\pi(r+h)
$$

But it is also:

$$
2\\pi r + 1
$$`,
  keyIdea:
    'Compare the old and new circumference formulas. The original radius cancels out completely.',
  solution: `We have:

$$
2\\pi(r+h) = 2\\pi r + 1
$$

Expand:

$$
2\\pi r + 2\\pi h = 2\\pi r + 1
$$

Subtract $2\\pi r$ from both sides:

$$
2\\pi h = 1
$$

Therefore:

$$
h = \\frac{1}{2\\pi}
$$

So:

$$
h \\approx 0.159
$$

The height is about 15.9 cm.`,
  lesson: `The surprising part is that the answer does not depend on $r$.
This shows how a simple formula can reveal a beautiful mathematical idea.`,
  coverImage: '',
  published: true,
};

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
    estimatedTime: String(payload.estimatedTime ?? ''),
    tags: Array.isArray(payload.tags) ? payload.tags.map(String).filter(Boolean) : [],
    coverImage: String(payload.coverImage ?? ''),
    ...(includeAdminFields ? { published: Boolean(payload.published) } : {}),
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
    published: Boolean(payload.published),
  };
}

export async function ensureSampleCoffeeProblem() {
  const existing = await CoffeeProblemModel.exists({ slug: SAMPLE_COFFEE_PROBLEM.slug });
  if (existing) return;

  await CoffeeProblemModel.create(SAMPLE_COFFEE_PROBLEM);
}
