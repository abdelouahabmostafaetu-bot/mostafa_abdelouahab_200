import type { Metadata } from 'next';
import LibraryAdminDashboard from '@/features/library/components/LibraryAdminDashboard';

export const metadata: Metadata = {
  title: 'Library Admin | Abdelouahab Mostafa',
  description: 'Admin interface for managing books in My Library.',
};

export default function LibraryAdminPage() {
  return <LibraryAdminDashboard />;
}
