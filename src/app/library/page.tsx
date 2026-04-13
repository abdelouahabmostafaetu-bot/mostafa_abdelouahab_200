import type { Metadata } from 'next';
import LibraryCatalogClient from '@/features/library/components/LibraryCatalogClient';

export const metadata: Metadata = {
  title: 'My Library | Abdelouahab Mostafa',
  description: 'Browse and download books from my personal library.',
};

export default function LibraryPage() {
  return <LibraryCatalogClient />;
}
