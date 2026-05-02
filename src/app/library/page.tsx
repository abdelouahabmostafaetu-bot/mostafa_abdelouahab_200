import type { Metadata } from 'next';
import { currentUser } from '@clerk/nextjs/server';
import LibraryPageClient from '@/components/library/LibraryPageClient';
import { getCurrentAdminUser } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'My Library | Abdelouahab Mostafa',
  description: 'Browse and download books from my personal library.',
};

export default async function LibraryPage() {
  const [adminUser, user] = await Promise.all([
    getCurrentAdminUser(),
    currentUser(),
  ]);

  return <LibraryPageClient showAdminLink={Boolean(adminUser)} isSignedIn={Boolean(user)} />;
}
