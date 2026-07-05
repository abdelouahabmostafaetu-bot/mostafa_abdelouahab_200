'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import AdminMarkdownEditor from '@/components/admin/AdminMarkdownEditor';
import type {
  DoctorateDifficulty,
  DoctorateExamType,
} from '@/types/doctorate-problem';

type SaveState = 'idle' | 'saving' | 'done' | 'error';

const EXAM_TYPES: { value: DoctorateExamType; label: string }[] = [
  { value: 'general', label: 'General Exam' },
  { value: 'specialist', label: 'Specialist Exam' },
];

const DIFFICULTIES: { value: DoctorateDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'very-hard', label: 'Very Hard' },
];

const inputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] ' +
  'px-3 py-2.5 text-sm text-[var(--color-text)] ' +
  'placeholder:text-[var(--color-text-tertiary)] ' +
  'outline-none focus:border-[var(--color-accent)] transition-colors duration-150';

const labelClass =
  'mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]';

export default function DoctorateProblemForm({
  editSlug,
}: {
  editSlug?: string;
}) {
  const router = useRouter();
  const isEditing = Boolean(editSlug);

  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState<DoctorateExamType>('general');
  const [specialty, setSpecialty] = useState('Mathematics');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [university, setUniversity] = useState('');
  const [source, setSource] = useState('');
  const [problemNumber, setProblemNumber] = useState('');
  const [difficulty, setDifficulty] = useState<DoctorateDifficulty>('medium');
  const [tags, setTags] = useState('');
  const [statement, setStatement] = useState('');
  const [solution, setSolution] = useState('');
  const [published, setPublished] = useState(true);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!editSlug) return;

    const load = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch(
          `/api/doctorate-problems/${editSlug}?admin=1`,
          { cache: 'no-store' },
        );
        const payload = (await res.json().catch(() => null)) as {
          success?: boolean;
          data?: Record<string, unknown>;
          error?: string;
        } | null;

        if (!res.ok || !payload?.success || !payload.data) {
          throw new Error(payload?.error ?? 'Failed to load problem.');
        }

        const d = payload.data;
        setTitle(String(d.title ?? ''));
        setExamType(d.examType === 'specialist' ? 'specialist' : 'general');
        setSpecialty(String(d.specialty ?? 'Mathematics'));
        setYear(String(d.year ?? ''));
        setUniversity(String(d.university ?? ''));
        setSource(String(d.source ?? ''));
        setProblemNumber(d.problemNumber ? String(d.problemNumber) : '');
        setDifficulty(
          DIFFICULTIES.some((x) => x.value === d.difficulty)
            ? (d.difficulty as DoctorateDifficulty)
            : 'medium',
        );
        setTags(Array.isArray(d.tags) ? (d.tags as string[]).join(', ') : '');
        setStatement(String(d.statement ?? ''));
        setSolution(String(d.solution ?? ''));
        setPublished(d.published !== false);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Unable to load problem.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [editSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setSaveState('error');
      setErrorMsg('Title is required.');
      return;
    }
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > 2100) {
      setSaveState('error');
      setErrorMsg('Please enter a valid exam year (e.g. 2024).');
      return;
    }
    if (!statement.trim()) {
      setSaveState('error');
      setErrorMsg('The problem statement is required.');
      return;
    }

    setSaveState('saving');
    setErrorMsg('');

    try {
      const body = {
        title: title.trim(),
        examType,
        specialty: specialty.trim() || 'Mathematics',
        year: yearNum,
        university: university.trim(),
        source: source.trim(),
        problemNumber: problemNumber.trim() ? Number(problemNumber) : null,
        difficulty,
        statement: statement.trim(),
        solution: solution.trim(),
        published,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const res = await fetch(
        isEditing
          ? `/api/doctorate-problems/${editSlug}`
          : '/api/doctorate-problems',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !data?.success) {
        throw new Error(data?.error ?? 'Failed to save problem.');
      }

      setSaveState('done');
      setTimeout(() => router.push('/admin/doctorate-exams'), 1200);
    } catch (err) {
      setSaveState('error');
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-[var(--color-text-secondary)]">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        Loading problem…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className={labelClass}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Compactness in metric spaces — Exercise 2"
          className={inputClass}
          required
        />
      </div>

      {/* Exam type + Year */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Exam Type *</label>
          <select
            value={examType}
            onChange={(e) =>
              setExamType(e.target.value as DoctorateExamType)
            }
            className={inputClass}
          >
            {EXAM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Exam Year *</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            min={1990}
            max={2100}
            placeholder="e.g. 2024"
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* Specialty + University */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Specialty</label>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="e.g. Functional Analysis, Algebra…"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>University</label>
          <input
            type="text"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder="e.g. University Center of Mila"
            className={inputClass}
          />
        </div>
      </div>

      {/* Problem number + Difficulty */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Problem Number{' '}
            <span className="normal-case font-normal">
              (optional — order within the exam)
            </span>
          </label>
          <input
            type="number"
            value={problemNumber}
            onChange={(e) => setProblemNumber(e.target.value)}
            min={1}
            max={99}
            placeholder="e.g. 1"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) =>
              setDifficulty(e.target.value as DoctorateDifficulty)
            }
            className={inputClass}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass}>Tags (comma separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. topology, compactness, sequences"
          className={inputClass}
        />
      </div>

      {/* Source */}
      <div>
        <label className={labelClass}>
          Source{' '}
          <span className="normal-case font-normal">
            (where this problem comes from)
          </span>
        </label>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. Doctorate entrance exam, University of Algiers 1, September 2024 session — official subject."
          rows={2}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Statement */}
      <div>
        <label className={labelClass}>Problem Statement *</label>
        <AdminMarkdownEditor
          value={statement}
          onChange={setStatement}
          placeholder="Write the full problem statement in Markdown. LaTeX is supported: $f(x) = x^2$ for inline math and $$ ... $$ for display math."
        />
      </div>

      {/* Solution */}
      <div>
        <label className={labelClass}>
          Solution{' '}
          <span className="normal-case font-normal">
            (strongly recommended — shown behind a reveal button)
          </span>
        </label>
        <AdminMarkdownEditor
          value={solution}
          onChange={setSolution}
          placeholder="Write the complete worked solution in Markdown with LaTeX. Leave empty to publish the problem with a 'Solution coming soon' notice."
        />
      </div>

      {/* Published */}
      <label className="inline-flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
        />
        <span className="text-sm text-[var(--color-text-secondary)]">
          Published (visible to everyone)
        </span>
      </label>

      {/* Error */}
      {saveState === 'error' && errorMsg && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/15 px-4 py-2.5 text-sm text-red-300">
          {errorMsg}
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saveState === 'saving' || saveState === 'done'}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saveState === 'saving' ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving…
            </>
          ) : saveState === 'done' ? (
            <>
              <CheckCircle2 size={14} /> Saved!
            </>
          ) : isEditing ? (
            'Save Changes'
          ) : (
            'Create Problem'
          )}
        </button>
        <Link
          href="/admin/doctorate-exams"
          className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
