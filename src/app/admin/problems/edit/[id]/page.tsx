import type { Metadata } from 'next';
import ProblemFormClient from '@/components/problems/ProblemFormClient';
import { requireAdmin } from '@/lib/admin';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Edit Problem | Abdelouahab Mostafa',
};

export default async function EditProblemPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  return <ProblemFormClient problemId={id} />;
}
