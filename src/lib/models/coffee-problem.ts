import mongoose, { type Model } from 'mongoose';
import type { CoffeeProblemLevel } from '@/types/coffee-problem';

export type CoffeeProblemDocument = {
  title: string;
  slug: string;
  shortDescription: string;
  level: CoffeeProblemLevel;
  difficulty: string;
  estimatedTime: string;
  tags: string[];
  problemStatement: string;
  fullProblemContent: string;
  hint1: string;
  hint2: string;
  keyIdea: string;
  solution: string;
  solutionContent: string;
  lesson: string;
  coverImage: string;
  published: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const coffeeProblemSchema = new mongoose.Schema<CoffeeProblemDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    difficulty: { type: String, default: 'beginner', trim: true },
    estimatedTime: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    problemStatement: { type: String, required: true },
    fullProblemContent: { type: String, default: '' },
    hint1: { type: String, default: '' },
    hint2: { type: String, default: '' },
    keyIdea: { type: String, default: '' },
    solution: { type: String, default: '' },
    solutionContent: { type: String, default: '' },
    lesson: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    published: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
  },
  {
    collection: 'coffeeProblems',
    timestamps: true,
  },
);

coffeeProblemSchema.index({ published: 1, createdAt: -1, _id: -1 });
coffeeProblemSchema.index({ isPublished: 1, createdAt: -1, _id: -1 });
coffeeProblemSchema.index({ level: 1, published: 1, createdAt: -1 });
coffeeProblemSchema.index({ tags: 1, published: 1 });
coffeeProblemSchema.index({
  title: 'text',
  shortDescription: 'text',
  tags: 'text',
  problemStatement: 'text',
});

coffeeProblemSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id ?? '');
    delete ret._id;
    return ret;
  },
});

const CoffeeProblemModel =
  (mongoose.models.CoffeeProblem as Model<CoffeeProblemDocument> | undefined) ??
  mongoose.model<CoffeeProblemDocument>(
    'CoffeeProblem',
    coffeeProblemSchema,
    'coffeeProblems',
  );

export default CoffeeProblemModel;
