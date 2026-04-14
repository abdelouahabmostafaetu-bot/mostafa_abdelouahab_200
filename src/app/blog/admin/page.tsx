import type { Metadata } from 'next';
import BlogAdminClient from '@/components/blog/BlogAdminClient';

export const metadata: Metadata = {
  title: 'Blog Admin | Abdelouahab Mostafa',
  description: 'Admin interface for writing and managing blog posts.',
};

export default function BlogAdminPage() {
  return <BlogAdminClient />;
}
