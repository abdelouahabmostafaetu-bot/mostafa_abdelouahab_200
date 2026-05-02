import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import EditBooksClient from '@/components/library/EditBooksClient';

export const metadata: Metadata = {
  title: 'Edit Books | Library Admin',
  description: 'Edit book information in the library.',
};

export default async function EditBooksPage() {
  await requireAdmin();

  return <EditBooksClient />;
}