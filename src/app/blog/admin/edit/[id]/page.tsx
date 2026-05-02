import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin';
import BlogAdminClient from '@/components/blog/BlogAdminClient';

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

  return <BlogAdminClient initialPostId={id} />;
}
