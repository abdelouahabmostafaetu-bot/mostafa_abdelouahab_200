'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import AdminMarkdownEditor from '@/components/admin/AdminMarkdownEditor';
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

const inputClasses =
  'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all duration-150 placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15';

function slugifyTitle(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function toForm(problem: Problem): FormState {
  return {
    title: problem.title,
    slug: problem.slug,
    shortDescription: problem.shortDescription,
    fullProblemContent: problem.fullProblemContent,
    solutionContent: problem.solutionContent,
    difficulty: problem.difficulty || 'beginner',
    estimatedTime: problem.estimatedTime || '10 min',
    tags: problem.tags.join(', '),
    isPublished: problem.isPublished,
  };
}

function parseTags(value: string) {
  const seen = new Set<string>();

  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
  const slugEditedRef = useRef(isEditing);

  const tagList = useMemo(() => parseTags(form.tags), [form.tags]);

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
        slugEditedRef.current = true;
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

  const updateTitle = (value: string) => {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugEditedRef.current ? current.slug : slugifyTitle(value),
    }));
  };

  const updateSlug = (value: string) => {
    slugEditedRef.current = true;
    updateField('slug', slugifyTitle(value));
  };

  const saveProblem = async (nextPublished = form.isPublished) => {
    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const endpoint = isEditing ? `/api/problems/${problemId}` : '/api/problems';
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: tagList,
          isPublished: nextPublished,
        }),
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
        slugEditedRef.current = false;
      } else {
        setForm(toForm(payload as Problem));
        slugEditedRef.current = true;
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
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <main className="space-y-5">
            <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
              <div className="space-y-4">
                <label className="block">
                  <FieldLabel help="Write a clear mathematical problem title. Inline LaTeX is supported.">
                    Title
                  </FieldLabel>
                  <input
                    value={form.title}
                    onChange={(event) => updateTitle(event.target.value)}
                    placeholder="Evaluate $\\int_0^1 \\frac{\\ln x}{1+x^2}\\,dx$"
                    className={`mt-2 ${inputClasses}`}
                    required
                  />
                </label>

                <label className="block">
                  <FieldLabel help="Auto-generated from the title until you edit it. Keep it short and URL-safe.">
                    Slug
                  </FieldLabel>
                  <input
                    value={form.slug}
                    onChange={(event) => updateSlug(event.target.value)}
                    placeholder="evaluate-log-integral"
                    className={`mt-2 ${inputClasses} font-mono`}
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

            <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                  Metadata
                </h2>
                <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(event) => updateField('isPublished', event.target.checked)}
                    className="rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                  />
                  <span>{form.isPublished ? 'Published' : 'Draft'}</span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <FieldLabel>Difficulty</FieldLabel>
                  <select
                    value={form.difficulty}
                    onChange={(event) => updateField('difficulty', event.target.value)}
                    className={`mt-2 ${inputClasses}`}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>

                <label className="block">
                  <FieldLabel>Estimated Time</FieldLabel>
                  <input
                    value={form.estimatedTime}
                    onChange={(event) => updateField('estimatedTime', event.target.value)}
                    placeholder="10 min"
                    className={`mt-2 ${inputClasses}`}
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <FieldLabel help="Use comma-separated tags. They will be saved as the same tag array as before.">
                  Tags
                </FieldLabel>
                <input
                  value={form.tags}
                  onChange={(event) => updateField('tags', event.target.value)}
                  placeholder="calculus, integrals, series"
                  className={`mt-2 ${inputClasses}`}
                />
              </label>

              {tagList.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tagList.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-1 text-xs text-[var(--color-accent)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => saveProblem(false)}
                disabled={isSaving}
                className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => saveProblem(isEditing ? form.isPublished : true)}
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

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                Formatting Help
              </h2>
              <div className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    Inline math
                  </p>
                  <code className="mt-1 block rounded bg-[var(--color-bg)] px-2 py-1 font-mono text-xs text-[var(--color-text)]">
                    $x^2+1$
                  </code>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    Display math
                  </p>
                  <code className="mt-1 block whitespace-pre rounded bg-[var(--color-bg)] px-2 py-1 font-mono text-xs text-[var(--color-text)]">
                    {'$$\n\\int_0^1 f(x)\\,dx\n$$'}
                  </code>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    Bold
                  </p>
                  <code className="mt-1 block rounded bg-[var(--color-bg)] px-2 py-1 font-mono text-xs text-[var(--color-text)]">
                    **important**
                  </code>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    List
                  </p>
                  <code className="mt-1 block whitespace-pre rounded bg-[var(--color-bg)] px-2 py-1 font-mono text-xs text-[var(--color-text)]">
                    {'- first step\n- second step'}
                  </code>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                Writing Tips
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>State the problem before giving context.</li>
                <li>Keep the card description short and searchable.</li>
                <li>Use tags for topic, method, and prerequisite ideas.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
