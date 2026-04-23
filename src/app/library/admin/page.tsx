import type { Metadata } from 'next';
import LibraryAdminClient from '@/components/library/LibraryAdminClient';

export const metadata: Metadata = {
  title: 'Library Admin | Abdelouahab Mostafa',
  description: 'Admin interface for managing books in My Library.',
};

export default function LibraryAdminPage() {
  return <LibraryAdminClient />;
}
