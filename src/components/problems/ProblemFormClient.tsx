'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { slugify } from '@/lib/utils';
import type { Problem } from '@/types/problem';

type FormState = {
  title: string;
  slug: string;
  shortDescription: string;
  fullProblemContent: string;
  solutionContent: string;
  difficulty: string;
  estimatedTime: string;
  tags: string;
  isPublished: boolean;
};

const emptyForm: FormState = {
  title: '',
  slug: '',
  shortDescription: '',
  fullProblemContent: '',
  solutionContent: '',
  difficulty: 'beginner',
  estimatedTime: '10 min',
  tags: '',
  isPublished: true,
};

function toForm(problem: Problem): FormState {
  return {
    title: problem.title,
    slug: problem.slug,
    shortDescription: problem.shortDescription,
    fullProblemContent: problem.fullProblemContent,
    solutionContent: problem.solutionContent,
    difficulty: problem.difficulty,
    estimatedTime: problem.estimatedTime,
    tags: problem.tags.join(', '),
    isPublished: problem.isPublished,
  };
}

export default function ProblemFormClient({ problemId = '' }: { problemId?: string }) {
  const isEditing = Boolean(problemId);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isEditing) return;

    const loadProblem = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await fetch(`/api/problems/${problemId}?admin=1`, {
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as
          | Problem
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            payload && 'error' in payload ? payload.error : 'Failed to load problem.',
          );
        }

        setForm(toForm(payload as Problem));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load problem.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadProblem();
  }, [isEditing, problemId]);

  useEffect(() => {
    if (slugTouched) return;
    setForm((current) => ({ ...current, slug: slugify(current.title) }));
  }, [form.title, slugTouched]);

  const inputClasses =
    'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30';

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProblem = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const endpoint = isEditing ? `/api/problems/${problemId}` : '/api/problems';
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as
        | Problem
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && 'error' in payload ? payload.error : 'Failed to save problem.',
        );
      }

      setStatusMessage(isEditing ? 'Problem updated successfully.' : 'Problem created successfully.');
      if (!isEditing) {
        setForm(emptyForm);
        setSlugTouched(false);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save problem.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="min-h-screen bg-[var(--color-bg)] px-4 pt-24 text-sm text-[var(--color-text-secondary)]">
        <div className="mx-auto max-w-5xl">Loading problem...</div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {isEditing ? 'Edit Problem' : 'Add Problem'}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Write the problem and solution with Markdown and math notation.
          </p>
          <Link
            href="/admin/problems"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to Problems Admin
          </Link>
        </header>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Title</span>
              <input
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                className={inputClasses}
                required
              />
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Slug</span>
              <input
                value={form.slug}
                onChange={(event) => {
                  updateField('slug', event.target.value);
                  setSlugTouched(true);
                }}
                className={inputClasses}
                required
              />
            </label>
          </div>

          <label className="block text-sm text-[var(--color-text-secondary)]">
            <span className="mb-1 block uppercase tracking-wide">Short Description</span>
            <textarea
              value={form.shortDescription}
              onChange={(event) => updateField('shortDescription', event.target.value)}
              rows={3}
              className={`${inputClasses} resize-none`}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Difficulty</span>
              <select
                value={form.difficulty}
                onChange={(event) => updateField('difficulty', event.target.value)}
                className={inputClasses}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Estimated Time</span>
              <input
                value={form.estimatedTime}
                onChange={(event) => updateField('estimatedTime', event.target.value)}
                placeholder="10 min"
                className={inputClasses}
              />
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Tags</span>
              <input
                value={form.tags}
                onChange={(event) => updateField('tags', event.target.value)}
                placeholder="geometry, pi, circle"
                className={inputClasses}
              />
            </label>
          </div>

          <label className="block text-sm text-[var(--color-text-secondary)]">
            <span className="mb-1 block uppercase tracking-wide">Full Problem Content</span>
            <textarea
              value={form.fullProblemContent}
              onChange={(event) => updateField('fullProblemContent', event.target.value)}
              rows={10}
              className={`${inputClasses} min-h-48 resize-y font-mono text-xs leading-6 sm:text-sm`}
              required
            />
          </label>

          <label className="block text-sm text-[var(--color-text-secondary)]">
            <span className="mb-1 block uppercase tracking-wide">Solution Content</span>
            <textarea
              value={form.solutionContent}
              onChange={(event) => updateField('solutionContent', event.target.value)}
              rows={10}
              className={`${inputClasses} min-h-48 resize-y font-mono text-xs leading-6 sm:text-sm`}
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => updateField('isPublished', event.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              Published
            </label>

            <button
              type="button"
              onClick={saveProblem}
              disabled={isSaving}
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#0f0e0d] hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Problem'}
            </button>
          </div>
        </div>

        {statusMessage ? (
          <div className="mt-6 border-l-4 border-emerald-500/60 px-4 py-3 text-sm text-emerald-300">
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 border-l-4 border-red-500/60 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
