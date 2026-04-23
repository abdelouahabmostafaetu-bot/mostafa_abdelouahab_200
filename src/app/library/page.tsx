import type { Metadata } from 'next';
import LibraryPageClient from '@/components/library/LibraryPageClient';

export const metadata: Metadata = {
  title: 'My Library | Abdelouahab Mostafa',
  description: 'Browse and download books from my personal library.',
};

export default function LibraryPage() {
  return <LibraryPageClient />;
}
