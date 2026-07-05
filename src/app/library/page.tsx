import type { Metadata } from 'next';
import LibraryPageClient from '@/components/library/LibraryPageClient';
import { getCurrentAdminUser } from '@/lib/admin';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'My Library | Abdelouahab Mostafa',
  description: 'Browse and download books from my personal library.',
};

export default async function LibraryPage() {
  const [adminUser, user] = await Promise.all([
    getCurrentAdminUser(),
    getSessionUser(),
  ]);

  return <LibraryPageClient showAdminLink={Boolean(adminUser)} isSignedIn={Boolean(user)} />;
}
