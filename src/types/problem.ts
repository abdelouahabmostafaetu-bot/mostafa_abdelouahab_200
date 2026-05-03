export type ProblemSummary = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  difficulty: string;
  estimatedTime: string;
  tags: string[];
  isPublished?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type Problem = ProblemSummary & {
  fullProblemContent: string;
  solutionContent: string;
  isPublished: boolean;
};

export type ProblemsResponse = {
  problems: ProblemSummary[];
  pagination: {
    page: number;
    limit: number;
    totalProblems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
