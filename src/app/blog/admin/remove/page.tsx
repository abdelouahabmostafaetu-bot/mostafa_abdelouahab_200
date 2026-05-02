import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import RemoveBlogPostsClient from '@/components/blog/RemoveBlogPostsClient';

export const metadata: Metadata = {
  title: 'Remove Blog Posts | Blog Admin',
  description: 'Remove blog posts from the blog.',
};

export default async function RemoveBlogPostsPage() {
  await requireAdmin();

  return <RemoveBlogPostsClient />;
}