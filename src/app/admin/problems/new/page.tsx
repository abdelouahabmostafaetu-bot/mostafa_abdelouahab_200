import type { Metadata } from 'next';
import ProblemFormClient from '@/components/problems/ProblemFormClient';
import { requireAdmin } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'Add Problem | Abdelouahab Mostafa',
};

export default async function NewProblemPage() {
  await requireAdmin();

  return <ProblemFormClient />;
}
