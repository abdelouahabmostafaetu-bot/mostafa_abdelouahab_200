import mongoose, { type Model } from 'mongoose';

export type BookDocument = {
  title: string;
  slug: string;
  author?: string;
  description?: string;
  tags: string[];
  category?: string;
  pdfUrl: string;
  fileUrl: string;
  filePathname: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  coverUrl?: string;
  coverPathname?: string;
  filePath?: string;
  addedAt?: string;
  createdAt: Date;
  updatedAt: Date;
};

const bookSchema = new mongoose.Schema<BookDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, index: true },
    author: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
    category: { type: String, default: 'Other', trim: true },

    pdfUrl: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    filePathname: { type: String, default: '' },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    fileType: { type: String, default: '' },

    coverUrl: { type: String, default: '' },
    coverPathname: { type: String, default: '' },

    // Kept for older local/Blob uploads that used filePath before fileUrl/filePathname.
    filePath: { type: String, default: '' },
    addedAt: { type: String, default: '' },
  },
  { timestamps: true },
);

bookSchema.index({ slug: 1 });
bookSchema.index({ createdAt: -1, _id: -1 });
bookSchema.index({ addedAt: -1, _id: -1 });
bookSchema.index({ category: 1, createdAt: -1 });
bookSchema.index({
  title: 'text',
  author: 'text',
  category: 'text',
  description: 'text',
  tags: 'text',
});

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
