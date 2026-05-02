import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin';
import CoffeeProblemsAdminClient from '@/components/problems/CoffeeProblemsAdminClient';

export const metadata: Metadata = {
  title: 'Remove Problems | Problems with Coffee Admin',
};

export default async function RemoveCoffeeProblemsPage() {
  await requireAdmin();
  return <CoffeeProblemsAdminClient />;
}
