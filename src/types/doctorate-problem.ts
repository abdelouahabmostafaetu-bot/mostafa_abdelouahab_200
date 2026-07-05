export type DoctorateExamType = 'general' | 'specialist';

export type DoctorateDifficulty = 'easy' | 'medium' | 'hard' | 'very-hard';

export const EXAM_TYPE_LABELS: Record<DoctorateExamType, string> = {
  general: 'General Exam',
  specialist: 'Specialist Exam',
};

export const DIFFICULTY_LABELS: Record<DoctorateDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  'very-hard': 'Very Hard',
};

export type DoctorateProblemSummary = {
  id: string;
  title: string;
  slug: string;
  examType: DoctorateExamType;
  specialty: string;
  year: number;
  university: string;
  difficulty: DoctorateDifficulty;
  tags: string[];
  hasSolution: boolean;
  problemNumber?: number;
  published?: boolean;
  createdAt: string;
};

export type DoctorateProblemDetail = DoctorateProblemSummary & {
  statement: string;
  solution: string;
  source: string;
};
