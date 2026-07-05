import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import MDXContent from '@/components/MDXContent';
import PrintButton from '@/components/doctorate/PrintButton';
import {
  EXAM_TYPE_LABELS,
  type DoctorateExamType,
} from '@/types/doctorate-problem';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ exam: string }> };

type LeanProblem = {
  _id: unknown;
  title: string;
  slug: string;
  specialty: string;
  university: string;
  source: string;
  year: number;
  examType: DoctorateExamType;
  problemNumber?: number;
  statement: string;
  solution: string;
};

type ParsedExam =
  | { examId: number }
  | { year: number; examType: DoctorateExamType };

function parseExam(exam: string): ParsedExam | null {
  if (/^\d+$/.test(exam)) return { examId: Number(exam) };
  const m = /^(\d{4})-(general|specialist)$/.exec(exam);
  if (!m) return null;
  return { year: Number(m[1]), examType: m[2] as DoctorateExamType };
}

function buildQuery(parsed: ParsedExam): Record<string, unknown> {
  return 'examId' in parsed
    ? { published: true, examId: parsed.examId }
    : { published: true, year: parsed.year, examType: parsed.examType };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { exam } = await params;
  const parsed = parseExam(exam);
  if (!parsed) return { title: 'Exam Not Found' };
  if ('year' in parsed) {
    return {
      title: `${EXAM_TYPE_LABELS[parsed.examType]} ${parsed.year} — Full Exam + Solutions (PDF)`,
      description: `Download the complete ${parsed.year} Algerian doctorate ${EXAM_TYPE_LABELS[parsed.examType].toLowerCase()} in mathematics with all problems and solutions.`,
    };
  }
  return {
    title: 'Doctorate Exam — Full Exam + Solutions (PDF)',
    description:
      'Download a complete Algerian doctorate entrance exam in mathematics with all problems and solutions.',
  };
}

export default async function DoctorateExamDownloadPage({
  params,
}: PageProps) {
  const { exam } = await params;
  const parsed = parseExam(exam);
  if (!parsed) notFound();

  let problems: LeanProblem[] = [];
  try {
    await connectToDatabase();
    problems = (await DoctorateProblem.find(buildQuery(parsed))
      .sort({ problemNumber: 1, createdAt: 1 })
      .select(
        'title slug specialty university source year examType problemNumber statement solution',
      )
      .lean()) as unknown as LeanProblem[];
  } catch (err) {
    console.error('Exam download: DB error:', err);
  }

  if (problems.length === 0) {
    notFound();
  }

  const first = problems[0];
  const year = first.year;
  const examType = first.examType;
  const examLabel = EXAM_TYPE_LABELS[examType];
  const solvedCount = problems.filter((p) =>
    String(p.solution ?? '').trim(),
  ).length;

  return (
    <div className="exam-print min-h-screen bg-white pb-16 pt-24 print:pt-0">
      <style>{`
        .exam-print, .exam-print * { color: #171717 !important; }
        .exam-print a { color: #b45309 !important; }
        .exam-print .katex { color: #171717 !important; }
        .exam-print hr { border-color: #d4d4d4 !important; }
        .exam-print blockquote { border-color: #d4d4d4 !important; }
        .exam-print code, .exam-print pre { background: #f5f5f5 !important; }
        @media print {
          header, footer, nav { display: none !important; }
          .print-hidden { display: none !important; }
          .page-break { break-before: page; page-break-before: always; }
          .exam-print { padding-top: 0 !important; }
        }
      `}</style>

      <div className="mx-auto max-w-[800px] px-6">
        {/* Toolbar (never printed) */}
        <div className="print-hidden mb-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
          <Link
            href="/doctorate-exams"
            className="inline-flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            Back to the archive
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-neutral-500">
              Tip: choose “Save as PDF” in the print dialog
            </span>
            <PrintButton />
          </div>
        </div>

        {/* ── Exam header ── */}
        <header className="mb-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">
            République Algérienne Démocratique et Populaire
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-neutral-500">
            Doctorate Entrance Examination — Mathematics
          </p>
          {first.university && (
            <p className="mt-3 text-sm font-medium">{first.university}</p>
          )}
          <h1 className="mt-4 font-serif text-2xl font-bold md:text-3xl">
            {examLabel} — {year}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {first.specialty} • {problems.length} problem
            {problems.length !== 1 ? 's' : ''} • {solvedCount} solution
            {solvedCount !== 1 ? 's' : ''} included
          </p>
          {first.source && (
            <p className="mx-auto mt-3 max-w-xl text-xs italic leading-5 text-neutral-500">
              {first.source}
            </p>
          )}
          <hr className="mt-6" />
        </header>

        {/* ── Part I: Problems ── */}
        <section>
          <h2 className="mb-6 font-serif text-xl font-bold">
            Part I — Exam Problems
          </h2>
          <div className="space-y-10">
            {problems.map((p, i) => (
              <article key={p.slug}>
                <h3 className="mb-3 border-b border-neutral-200 pb-2 font-serif text-lg font-semibold">
                  Exercice {p.problemNumber ?? i + 1} — {p.title}
                </h3>
                <div className="exam-reading text-[15px] leading-7">
                  <MDXContent content={p.statement} />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Part II: Solutions (starts on a new printed page) ── */}
        <section className="page-break mt-14 border-t border-neutral-300 pt-10 print:border-t-0">
          <h2 className="mb-6 font-serif text-xl font-bold">
            Part II — Complete Solutions
          </h2>
          <div className="space-y-12">
            {problems.map((p, i) => (
              <article key={p.slug}>
                <h3 className="mb-3 border-b border-neutral-200 pb-2 font-serif text-lg font-semibold">
                  Solution — Exercice {p.problemNumber ?? i + 1}
                </h3>
                {String(p.solution ?? '').trim() ? (
                  <div className="exam-reading text-[15px] leading-7">
                    <MDXContent content={p.solution} />
                  </div>
                ) : (
                  <p className="text-sm italic text-neutral-500">
                    The solution for this exercise is being prepared and will
                    be published soon.
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 border-t border-neutral-200 pt-4 text-center text-[11px] text-neutral-500">
          Doctorate Exam Archive — mostafaabdelouahab.me • {examLabel}{' '}
          {year}
        </footer>
      </div>
    </div>
  );
}
