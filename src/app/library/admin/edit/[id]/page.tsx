import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import EditBookClient from '@/components/library/EditBookClient';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Edit Book | Library Admin',
  description: 'Edit book information.',
};

export default async function EditBookPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  return <EditBookClient bookId={id} />;
}