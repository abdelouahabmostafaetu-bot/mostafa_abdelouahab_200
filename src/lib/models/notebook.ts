import mongoose, { type Model } from 'mongoose';

export type NotebookDoc = {
  title: string;
  slug: string;
  subject: string;
  description: string;
  color: string;
  isPublished: boolean;
};

const schema = new mongoose.Schema<NotebookDoc>(
  {
    title:       { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, trim: true },
    subject:     { type: String, default: 'Mathematics', trim: true },
    description: { type: String, default: '', trim: true },
    color:       { type: String, default: '#194a50' },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

schema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const NotebookModel =
  (mongoose.models.Notebook as Model<NotebookDoc> | undefined) ??
  mongoose.model<NotebookDoc>('Notebook', schema);
