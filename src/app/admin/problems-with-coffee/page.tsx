import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin';
import CoffeeProblemsAdminClient from '@/components/problems/CoffeeProblemsAdminClient';

export const metadata: Metadata = {
  title: 'Problems with Coffee Admin | Abdelouahab Mostafa',
};

export default async function CoffeeProblemsAdminPage() {
  await requireAdmin();
  return <CoffeeProblemsAdminClient />;
}
