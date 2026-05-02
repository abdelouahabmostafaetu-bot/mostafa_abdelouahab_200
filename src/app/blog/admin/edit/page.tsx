import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import EditBlogPostsClient from '@/components/blog/EditBlogPostsClient';

export const metadata: Metadata = {
  title: 'Edit Blog Posts | Blog Admin',
  description: 'Edit existing blog posts.',
};

export default async function EditBlogPostsPage() {
  await requireAdmin();

  return <EditBlogPostsClient />;
}