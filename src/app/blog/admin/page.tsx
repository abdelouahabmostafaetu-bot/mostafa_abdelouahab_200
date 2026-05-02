import type { Metadata } from 'next';
import BlogAdminClient from '@/components/blog/BlogAdminClient';
import { requireAdmin } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'Blog Admin | Abdelouahab Mostafa',
  description: 'Admin interface for writing and managing blog posts.',
};

export default async function BlogAdminPage() {
  await requireAdmin();

  return <BlogAdminClient />;
}
