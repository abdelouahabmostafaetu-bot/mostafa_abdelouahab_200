import mongoose, { type Model } from 'mongoose';

export type BlogPostDocument = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  coverImageUrl: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
};

const blogPostSchema = new mongoose.Schema<BlogPostDocument>({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, unique: true },
  excerpt: { type: String, default: '' },
  category: { type: String, default: 'Mathematics' },
  tags: { type: [String], default: [] },
  coverImageUrl: { type: String, default: '' },
  content: { type: String, required: true },
  isPublished: { type: Boolean, default: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
  publishedAt: { type: String, default: '' },
});

blogPostSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id ?? '');
    delete ret._id;
    return ret;
  },
});

const BlogPostModel =
  (mongoose.models.BlogPost as Model<BlogPostDocument> | undefined) ??
  mongoose.model<BlogPostDocument>('BlogPost', blogPostSchema);

export default BlogPostModel;
