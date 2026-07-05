'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import AdminMarkdownEditor from '@/components/admin/AdminMarkdownEditor';
import type {
  DoctorateDifficulty,
  DoctorateExamType,
} from '@/types/doctorate-problem';

type SaveState = 'idle' | 'saving' | 'done' | 'error';

type ProblemDraft = {
  difficulty: DoctorateDifficulty;
  tags: string;
  statement: string;
  solution: string;
  collapsed: boolean;
};

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

function emptyProblem(): ProblemDraft {
  return {
    difficulty: 'medium',
    tags: '',
    statement: '',
    solution: '',
    collapsed: false,
  };
}

/**
 * DoctorateExamForm — add a FULL exam in one go: shared exam info
 * (type, year, specialty, university, source) + every exercice of the
 * exam with its statement and solution. Exercices have no titles —
 * they are numbered automatically (Exercice 1, Exercice 2, …).
 */
export default function DoctorateExamForm() {
  const router = useRouter();

  const [examType, setExamType] = useState<DoctorateExamType>('general');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [specialty, setSpecialty] = useState('Mathematics');
  const [university, setUniversity] = useState('');
  const [source, setSource] = useState('');
  const [problems, setProblems] = useState<ProblemDraft[]>([emptyProblem()]);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const updateProblem = (
    index: number,
    patch: Partial<ProblemDraft>,
  ): void => {
    setProblems((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  };

  const addProblem = () => {
    setProblems((prev) => [
      ...prev.map((p) => ({ ...p, collapsed: true })),
      emptyProblem(),
    ]);
  };

  const removeProblem = (index: number) => {
    setProblems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > 2100) {
      setSaveState('error');
      setErrorMsg('Please enter a valid exam year (e.g. 2025).');
      return;
    }
    for (let i = 0; i < problems.length; i += 1) {
      if (!problems[i].statement.trim()) {
        setSaveState('error');
        setErrorMsg(`Exercice ${i + 1}: the statement is required.`);
        return;
      }
    }

    setSaveState('saving');
    setErrorMsg('');

    try {
      const res = await fetch('/api/doctorate-problems/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType,
          year: yearNum,
          specialty: specialty.trim() || 'Mathematics',
          university: university.trim(),
          source: source.trim(),
          problems: problems.map((p, i) => ({
            problemNumber: i + 1,
            difficulty: p.difficulty,
            statement: p.statement.trim(),
            solution: p.solution.trim(),
            tags: p.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          })),
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        created?: number;
        error?: string;
      } | null;

      if (!res.ok || !data?.success) {
        throw new Error(data?.error ?? 'Failed to save the exam.');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Exam information (shared by all problems) ── */}
      <fieldset className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <legend className="px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">
          Exam Information
        </legend>

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
              placeholder="e.g. 2025"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Specialty</label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Mathematics (MFD & RO)"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>University</label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="e.g. Université de Blida 1"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>
            Source{' '}
            <span className="normal-case font-normal">
              (official exam reference — applied to every exercice)
            </span>
          </label>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Concours d'accès à la première année Doctorat LMD 2024-2025 — Épreuve N°03 : Mathématiques générales, Université de Blida 1, 08 Février 2025."
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </div>
      </fieldset>

      {/* ── Exercices ── */}
      <div className="space-y-5">
        {problems.map((p, i) => (
          <fieldset
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <legend className="px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">
              Exercice {i + 1}
            </legend>

            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--color-text)]">
                Exercice {i + 1}
                {p.statement.trim() ? '' : ' — (empty)'}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateProblem(i, { collapsed: !p.collapsed })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  {p.collapsed ? (
                    <>
                      <ChevronDown size={12} aria-hidden="true" /> Expand
                    </>
                  ) : (
                    <>
                      <ChevronUp size={12} aria-hidden="true" /> Collapse
                    </>
                  )}
                </button>
                {problems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProblem(i)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 size={12} aria-hidden="true" /> Remove
                  </button>
                )}
              </div>
            </div>

            {!p.collapsed && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Difficulty</label>
                    <select
                      value={p.difficulty}
                      onChange={(e) =>
                        updateProblem(i, {
                          difficulty: e.target
                            .value as DoctorateDifficulty,
                        })
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
                  <div>
                    <label className={labelClass}>
                      Tags (comma separated, optional)
                    </label>
                    <input
                      type="text"
                      value={p.tags}
                      onChange={(e) =>
                        updateProblem(i, { tags: e.target.value })
                      }
                      placeholder="e.g. linear-algebra, eigenvalues"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Statement *</label>
                  <AdminMarkdownEditor
                    value={p.statement}
                    onChange={(value: string) =>
                      updateProblem(i, { statement: value })
                    }
                    placeholder="Write the statement in Markdown. LaTeX supported: $f(x) = x^2$ inline, $$ ... $$ display."
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Solution{' '}
                    <span className="normal-case font-normal">
                      (recommended — leave empty for a coming-soon notice)
                    </span>
                  </label>
                  <AdminMarkdownEditor
                    value={p.solution}
                    onChange={(value: string) =>
                      updateProblem(i, { solution: value })
                    }
                    placeholder="Write the complete worked solution in Markdown with LaTeX."
                  />
                </div>
              </div>
            )}
          </fieldset>
        ))}

        <button
          type="button"
          onClick={addProblem}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Plus size={15} aria-hidden="true" />
          Add another exercice to this exam
        </button>
      </div>

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
              <Loader2 size={14} className="animate-spin" /> Saving exam…
            </>
          ) : saveState === 'done' ? (
            <>
              <CheckCircle2 size={14} /> Exam saved!
            </>
          ) : (
            `Publish Exam (${problems.length} exercice${problems.length !== 1 ? 's' : ''})`
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
