import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import RemoveBooksClient from '@/components/library/RemoveBooksClient';

export const metadata: Metadata = {
  title: 'Remove Books | Library Admin',
  description: 'Remove books from the library.',
};

export default async function RemoveBooksPage() {
  await requireAdmin();

  return <RemoveBooksClient />;
}