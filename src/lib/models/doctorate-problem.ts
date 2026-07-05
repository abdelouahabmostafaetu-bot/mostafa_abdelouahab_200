import mongoose, { Document, Schema } from 'mongoose';

/**
 * DoctorateProblem — a past problem from the Algerian mathematics
 * doctorate (PhD) entrance exams. Every year there are two exams:
 *  - 'general'    → the general mathematics exam
 *  - 'specialist' → the specialty exam (Analysis, Algebra, ...)
 */
export interface IDoctorateProblem extends Document {
  title: string;
  slug: string;
  examType: 'general' | 'specialist';
  specialty: string;
  year: number;
  university: string;
  source: string;
  problemNumber?: number;
  statement: string;
  solution: string;
  remark: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'very-hard';
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorateProblemSchema = new Schema<IDoctorateProblem>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [250, 'Title must be less than 250 characters'],
      minlength: [3, 'Title must be at least 3 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    examType: {
      type: String,
      enum: ['general', 'specialist'],
      required: [true, 'Exam type is required'],
    },
    specialty: {
      type: String,
      trim: true,
      default: 'Mathematics',
      maxlength: [120, 'Specialty must be less than 120 characters'],
    },
    year: {
      type: Number,
      required: [true, 'Exam year is required'],
      min: [1990, 'Year must be 1990 or later'],
      max: [2100, 'Year must be realistic'],
    },
    university: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'University must be less than 200 characters'],
    },
    source: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Source must be less than 500 characters'],
    },
    problemNumber: {
      type: Number,
      min: 1,
      max: 99,
    },
    statement: {
      type: String,
      required: [true, 'Problem statement is required'],
      minlength: [10, 'Statement must be at least 10 characters'],
    },
    solution: {
      type: String,
      default: '',
    },
    remark: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]) => tags.length <= 12,
        message: 'Maximum 12 tags allowed',
      },
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'very-hard'],
      default: 'medium',
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for performance
DoctorateProblemSchema.index({ published: 1, year: -1, problemNumber: 1 });
DoctorateProblemSchema.index({ examType: 1, year: -1, published: 1 });
DoctorateProblemSchema.index({ specialty: 1, published: 1 });
DoctorateProblemSchema.index({ tags: 1 });
DoctorateProblemSchema.index({
  title: 'text',
  statement: 'text',
  specialty: 'text',
  university: 'text',
});

export const DoctorateProblem =
  mongoose.models.DoctorateProblem ||
  mongoose.model<IDoctorateProblem>('DoctorateProblem', DoctorateProblemSchema);
