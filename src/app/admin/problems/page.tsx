import type { Metadata } from 'next';
import ProblemsAdminClient from '@/components/problems/ProblemsAdminClient';
import { requireAdmin } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'Problems Admin | Abdelouahab Mostafa',
};

export default async function ProblemsAdminPage() {
  await requireAdmin();

  return <ProblemsAdminClient />;
}
