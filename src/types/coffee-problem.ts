export type CoffeeProblemLevel = 'beginner' | 'intermediate' | 'advanced';

export type CoffeeProblemSummary = {
  title: string;
  slug: string;
  shortDescription: string;
  level: CoffeeProblemLevel;
  estimatedTime: string;
  tags: string[];
  coverImage: string;
  published?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type CoffeeProblem = CoffeeProblemSummary & {
  problemStatement: string;
  hint1: string;
  hint2: string;
  keyIdea: string;
  solution: string;
  lesson: string;
  published: boolean;
};

export type CoffeeProblemsResponse = {
  problems: CoffeeProblemSummary[];
  pagination: {
    page: number;
    limit: number;
    totalProblems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
