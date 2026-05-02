import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import AddBlogPostClient from '@/components/blog/AddBlogPostClient';

export const metadata: Metadata = {
  title: 'Write New Post | Blog Admin',
  description: 'Create a new blog post.',
};

export default async function AddBlogPostPage() {
  await requireAdmin();

  return <AddBlogPostClient />;
}