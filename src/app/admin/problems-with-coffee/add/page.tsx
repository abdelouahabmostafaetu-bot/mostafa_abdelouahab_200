import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin';
import CoffeeProblemFormClient from '@/components/problems/CoffeeProblemFormClient';

export const metadata: Metadata = {
  title: 'Add Problem | Problems with Coffee',
};

export default async function AddCoffeeProblemPage() {
  await requireAdmin();
  return <CoffeeProblemFormClient />;
}
