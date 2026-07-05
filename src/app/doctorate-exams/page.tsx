import type { Metadata } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import { mapDoctorateProblemSummary } from '@/lib/doctorate-problems';
import type { DoctorateProblemSummary } from '@/types/doctorate-problem';
import DoctorateExamsExplorer from '@/components/doctorate/DoctorateExamsExplorer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Doctorate Exam Archive — Algeria',
  description:
    'Past mathematics doctorate (PhD) entrance exams in Algeria — general and specialist exams from previous years, with complete professional solutions.',
};

async function getProblems(): Promise<DoctorateProblemSummary[]> {
  try {
    await connectToDatabase();
    const problems = await DoctorateProblem.find({ published: true })
      .sort({ year: -1, problemNumber: 1, createdAt: -1 })
      .select(
        'title slug examId examType specialty year university difficulty tags solution problemNumber createdAt',
      )
      .lean();
    return problems.map(mapDoctorateProblemSummary);
  } catch {
    return [];
  }
}

export default async function DoctorateExamsPage() {
  const problems = await getProblems();
  return <DoctorateExamsExplorer problems={problems} />;
}
