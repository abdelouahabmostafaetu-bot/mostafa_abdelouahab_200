import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import EditBlogPostClient from '@/components/blog/EditBlogPostClient';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Edit Blog Post | Blog Admin',
  description: 'Edit blog post content and metadata.',
};

export default async function EditBlogPostPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  return <EditBlogPostClient postId={id} />;
}