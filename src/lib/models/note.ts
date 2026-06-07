import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  title: string;
  slug: string;
  category: 'theorem' | 'definition' | 'lemma' | 'corollary' | 'conjecture' | 'note';
  content: string;
  preview?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'research';
  isFavorite: boolean;
  published: boolean;
  author?: string;
  references?: string[];
  relatedNotes?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title must be less than 200 characters'],
      minlength: [3, 'Title must be at least 3 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['theorem', 'definition', 'lemma', 'corollary', 'conjecture', 'note'],
      default: 'note',
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      minlength: [10, 'Content must be at least 10 characters'],
    },
    preview: {
      type: String,
      maxlength: [300, 'Preview must be less than 300 characters'],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]) => tags.length <= 10,
        message: 'Maximum 10 tags allowed',
      },
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'research'],
      default: 'intermediate',
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    published: {
      type: Boolean,
      default: true,
    },
    author: {
      type: String,
      default: 'Mostafa Abdelouahab',
    },
    references: {
      type: [String],
      default: [],
    },
    relatedNotes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Note',
      },
    ],
  },
  { timestamps: true }
);

// Indexes for performance
NoteSchema.index({ published: 1, createdAt: -1 });
NoteSchema.index({ slug: 1 });
NoteSchema.index({ category: 1, published: 1 });
NoteSchema.index({ tags: 1 });
NoteSchema.index({ isFavorite: 1, published: 1 });
NoteSchema.index({ title: 'text', content: 'text' });

export const Note = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
