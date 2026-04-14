export type BlogPost = {
  id: string;
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
  readingTime: string;
};
