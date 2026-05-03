'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminMarkdownEditor from '@/components/admin/AdminMarkdownEditor';
import type { Problem } from '@/types/problem';

type FormState = {
  title: string;
  shortDescription: string;
  fullProblemContent: string;
  solutionContent: string;
};

const emptyForm: FormState = {
  title: '',
  shortDescription: '',
  fullProblemContent: '',
  solutionContent: '',
};

const inputClasses =
  'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all duration-150 placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15';

function toForm(problem: Problem): FormState {
  return {
    title: problem.title,
    shortDescription: problem.shortDescription,
    fullProblemContent: problem.fullProblemContent,
    solutionContent: problem.solutionContent,
  };
}

function FieldLabel({
  children,
  help,
}: {
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <div>
      <span className="block text-sm font-semibold text-[var(--color-text)]">
        {children}
      </span>
      {help ? (
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-tertiary)]">
          {help}
        </p>
      ) : null}
    </div>
  );
}

export default function ProblemFormClient({ problemId = '' }: { problemId?: string }) {
  const isEditing = Boolean(problemId);
  const [form, setForm] = useState<FormState>(emptyForm);
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

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProblem = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const endpoint = isEditing ? `/api/problems/${problemId}` : '/api/problems';
      const requestPayload = {
        title: form.title,
        shortDescription: form.shortDescription,
        fullProblemContent: form.fullProblemContent,
        solutionContent: form.solutionContent,
        ...(isEditing
          ? {}
          : {
              isPublished: true,
              difficulty: 'Beginner',
              estimatedTime: '10 min',
              tags: [],
            }),
      };
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
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
      } else {
        setForm(toForm(payload as Problem));
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
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[var(--color-text)]">
                {isEditing ? 'Edit Problem' : 'Add Problem'}
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Write a mathematical problem using Markdown and LaTeX.
              </p>
            </div>
            <Link
              href="/admin/problems"
              className="inline-flex w-fit rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-accent)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
            >
              Back to Problems Admin
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-4xl">
          <main className="space-y-5">
            <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
              <div className="space-y-4">
                <label className="block">
                  <FieldLabel help="Write a clear mathematical problem title. Inline LaTeX is supported.">
                    Title
                  </FieldLabel>
                  <input
                    value={form.title}
                    onChange={(event) => updateField('title', event.target.value)}
                    placeholder="Evaluate $\\int_0^1 \\frac{\\ln x}{1+x^2}\\,dx$"
                    className={`mt-2 ${inputClasses}`}
                    required
                  />
                </label>

                <label className="block">
                  <FieldLabel help="This is the preview shown on cards. Markdown and inline LaTeX are supported.">
                    Short Description
                  </FieldLabel>
                  <textarea
                    value={form.shortDescription}
                    onChange={(event) => updateField('shortDescription', event.target.value)}
                    placeholder="A classical integral involving logarithms and rational functions."
                    rows={3}
                    className={`mt-2 ${inputClasses} resize-none`}
                    required
                  />
                </label>
              </div>
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
              <AdminMarkdownEditor
                label="Problem Details"
                value={form.fullProblemContent}
                onChange={(value) => updateField('fullProblemContent', value)}
                placeholder={`Compute\n$$\nI=\\int_0^1 \\frac{\\ln x}{1+x^2}\\,dx.\n$$`}
                uploadEndpoint="/api/problems-with-coffee/upload-image"
              />
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
              <AdminMarkdownEditor
                label="Solution"
                value={form.solutionContent}
                onChange={(value) => updateField('solutionContent', value)}
                placeholder="Write a detailed solution. Use Markdown and LaTeX."
                uploadEndpoint="/api/problems-with-coffee/upload-image"
              />
            </section>

            <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => saveProblem()}
                disabled={isSaving}
                className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#0f0e0d] transition hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish'}
              </button>
            </div>

            {statusMessage ? (
              <div className="border-l-4 border-emerald-500/60 px-4 py-3 text-sm text-emerald-300">
                {statusMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="border-l-4 border-red-500/60 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </section>
  );
}
