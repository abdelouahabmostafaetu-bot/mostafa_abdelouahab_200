import mongoose, { type Model } from 'mongoose';

export type BookDocument = {
  title: string;
  author: string;
  category: string;
  description: string;
  coverUrl: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  addedAt: string;
};

const bookSchema = new mongoose.Schema<BookDocument>({
  title: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  filePath: { type: String, default: '' },
  addedAt: { type: String, required: true },
});

bookSchema.index({ addedAt: -1, _id: -1 });
bookSchema.index({ category: 1, addedAt: -1 });
bookSchema.index({ title: 'text', author: 'text', category: 'text', description: 'text' });

bookSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id ?? '');
    delete ret._id;
    return ret;
  },
});

const BookModel =
  (mongoose.models.Book as Model<BookDocument> | undefined) ??
  mongoose.model<BookDocument>('Book', bookSchema);

export default BookModel;
