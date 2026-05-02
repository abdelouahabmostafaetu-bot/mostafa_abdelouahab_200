import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import AddBookClient from '@/components/library/AddBookClient';

export const metadata: Metadata = {
  title: 'Add New Book | Library Admin',
  description: 'Add a new book to the library.',
};

export default async function AddBookPage() {
  await requireAdmin();

  return <AddBookClient />;
}