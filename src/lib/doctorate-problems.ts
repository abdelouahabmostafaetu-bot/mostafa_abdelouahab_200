/* eslint-disable @typescript-eslint/no-explicit-any */
import { slugify } from '@/lib/utils';
import type {
  DoctorateProblemDetail,
  DoctorateProblemSummary,
} from '@/types/doctorate-problem';

/** Stable, unique slug: "2024-general-banach-fixed-point" */
export function buildDoctorateSlug(
  year: number,
  examType: string,
  title: string,
): string {
  return slugify(`${year} ${examType} ${title}`);
}

export function mapDoctorateProblemSummary(p: any): DoctorateProblemSummary {
  return {
    id: p._id?.toString?.() || p.id,
    title: p.title,
    slug: p.slug,
    examType: p.examType,
    specialty: p.specialty || 'Mathematics',
    year: p.year,
    university: p.university || '',
    difficulty: p.difficulty || 'medium',
    tags: Array.isArray(p.tags) ? p.tags : [],
    hasSolution: Boolean(String(p.solution ?? '').trim()),
    problemNumber: p.problemNumber ?? undefined,
    published: p.published,
    createdAt: p.createdAt
      ? new Date(p.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

export function mapDoctorateProblemDetail(p: any): DoctorateProblemDetail {
  return {
    ...mapDoctorateProblemSummary(p),
    statement: p.statement ?? '',
    solution: p.solution ?? '',
    source: p.source ?? '',
  };
}
