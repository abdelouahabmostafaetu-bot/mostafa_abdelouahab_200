export const PRESET_CATEGORIES = [
  'Mathematics',
  'Physics',
  'Computer Science',
  'Programming',
  'Engineering',
  'Literature',
  'Philosophy',
  'History',
  'Biology',
  'Chemistry',
  'Economics',
  'Psychology',
  'Art',
  'Music',
  'Languages',
  'Other',
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

export function normalizeCategory(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Other';
  }

  const found = PRESET_CATEGORIES.find(
    (category) => category.toLowerCase() === trimmed.toLowerCase(),
  );

  return found ?? 'Other';
}
