import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CoffeeProblemFormClient from '@/components/problems/CoffeeProblemFormClient';
import { mapCoffeeProblem } from '@/lib/coffee-problems';
import { requireAdmin } from '@/lib/admin';
import { connectToDatabase } from '@/lib/mongodb';
import CoffeeProblemModel from '@/lib/models/coffee-problem';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Edit Problem | Problems with Coffee',
};

export default async function EditCoffeeProblemPage({ params }: PageProps) {
  await requireAdmin();
  await connectToDatabase();

  const { slug } = await params;
  const problem = await CoffeeProblemModel.findOne({ slug }).lean();

  if (!problem) {
    notFound();
  }

  return (
    <CoffeeProblemFormClient
      initialProblem={mapCoffeeProblem(
        problem as Parameters<typeof mapCoffeeProblem>[0],
      )}
    />
  );
}
