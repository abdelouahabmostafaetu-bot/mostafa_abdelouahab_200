import type { Metadata } from 'next';
import LibraryAdminClient from '@/components/library/LibraryAdminClient';
import { requireAdmin } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'Library Admin | Abdelouahab Mostafa',
  description: 'Admin interface for managing books in My Library.',
};

export default async function LibraryAdminPage() {
  await requireAdmin();

  return <LibraryAdminClient />;
}
