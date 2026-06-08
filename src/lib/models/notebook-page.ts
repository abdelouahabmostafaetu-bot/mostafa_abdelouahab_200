import mongoose, { type Model } from 'mongoose';

export type NotebookPageDoc = {
  notebookSlug: string;
  pageNumber: number;
  title: string;
  content: string;
};

const schema = new mongoose.Schema<NotebookPageDoc>(
  {
    notebookSlug: { type: String, required: true },
    pageNumber:   { type: Number, required: true },
    title:        { type: String, default: '', trim: true },
    content:      { type: String, default: '' },
  },
  { timestamps: true },
);

schema.index({ notebookSlug: 1, pageNumber: 1 }, { unique: true });
schema.index({ notebookSlug: 1, pageNumber: 1 });

schema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const NotebookPageModel =
  (mongoose.models.NotebookPage as Model<NotebookPageDoc> | undefined) ??
  mongoose.model<NotebookPageDoc>('NotebookPage', schema);
