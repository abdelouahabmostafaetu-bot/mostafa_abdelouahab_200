'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { slugify } from '@/lib/utils';
import type { CoffeeProblem, CoffeeProblemLevel } from '@/types/coffee-problem';

type ProblemField =
  | 'problemStatement'
  | 'hint1'
  | 'hint2'
  | 'keyIdea'
  | 'solution'
  | 'lesson';

type FormState = {
  title: string;
  slug: string;
  shortDescription: string;
  level: CoffeeProblemLevel;
  estimatedTime: string;
  tags: string;
  coverImage: string;
  problemStatement: string;
  hint1: string;
  hint2: string;
  keyIdea: string;
  solution: string;
  lesson: string;
  published: boolean;
};

const emptyForm: FormState = {
  title: '',
  slug: '',
  shortDescription: '',
  level: 'beginner',
  estimatedTime: '10 min',
  tags: '',
  coverImage: '',
  problemStatement: '',
  hint1: '',
  hint2: '',
  keyIdea: '',
  solution: '',
  lesson: '',
  published: true,
};

const fieldLabels: Array<{ field: ProblemField; label: string; rows: number }> = [
  { field: 'problemStatement', label: 'Problem Statement', rows: 8 },
  { field: 'hint1', label: 'Hint 1', rows: 4 },
  { field: 'hint2', label: 'Hint 2', rows: 4 },
  { field: 'keyIdea', label: 'Key Idea', rows: 4 },
  { field: 'solution', label: 'Solution', rows: 9 },
  { field: 'lesson', label: 'Lesson', rows: 4 },
];

function toForm(problem?: CoffeeProblem | null): FormState {
  if (!problem) return emptyForm;

  return {
    title: problem.title,
    slug: problem.slug,
    shortDescription: problem.shortDescription,
    level: problem.level,
    estimatedTime: problem.estimatedTime,
    tags: problem.tags.join(', '),
    coverImage: problem.coverImage,
    problemStatement: problem.problemStatement,
    hint1: problem.hint1,
    hint2: problem.hint2,
    keyIdea: problem.keyIdea,
    solution: problem.solution,
    lesson: problem.lesson,
    published: problem.published,
  };
}

async function requestPreviewHtml(content: string) {
  const response = await fetch('/api/blog-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { html?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Failed to render preview.');
  }

  return payload?.html ?? '';
}

function parseUploadResponse(responseText: string) {
  try {
    return JSON.parse(responseText || '{}') as {
      markdown?: string;
      error?: string;
    };
  } catch {
    return { error: 'Failed to upload image.' };
  }
}

export default function CoffeeProblemFormClient({
  initialProblem = null,
}: {
  initialProblem?: CoffeeProblem | null;
}) {
  const isEditing = Boolean(initialProblem);
  const [form, setForm] = useState<FormState>(() => toForm(initialProblem));
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProblem));
  const [activeField, setActiveField] = useState<ProblemField>('problemStatement');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const editorRefs = useRef<Partial<Record<ProblemField, HTMLTextAreaElement | null>>>({});

  useEffect(() => {
    if (slugTouched) return;
    setForm((current) => ({ ...current, slug: slugify(current.title) }));
  }, [form.title, slugTouched]);

  const inputClasses =
    'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30';

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const insertMarkdown = (markdown: string) => {
    const textarea = editorRefs.current[activeField];
    const currentValue = form[activeField];

    if (!textarea) {
      updateField(activeField, `${currentValue}\n${markdown}\n`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue =
      currentValue.slice(0, start) +
      `\n${markdown}\n` +
      currentValue.slice(end);
    updateField(activeField, nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + markdown.length + 2;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const uploadImage = async () => {
    if (!imageFile) {
      setErrorMessage('Choose an image first.');
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage('');

    try {
      const body = new FormData();
      body.append('file', imageFile);

      const markdown = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/problems-with-coffee/upload-image');
        xhr.addEventListener('load', () => {
          const payload = parseUploadResponse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && payload.markdown) {
            resolve(payload.markdown);
            return;
          }
          reject(new Error(payload.error ?? 'Failed to upload image.'));
        });
        xhr.addEventListener('error', () => reject(new Error('Failed to upload image.')));
        xhr.send(body);
      });

      insertMarkdown(markdown);
      setImageFile(null);
      setStatusMessage('Image uploaded and inserted.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const renderPreview = async () => {
    setIsPreviewLoading(true);
    setErrorMessage('');
    try {
      setPreviewHtml(await requestPreviewHtml(form.problemStatement));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to render preview.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const saveProblem = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const endpoint = isEditing
        ? `/api/problems-with-coffee/${initialProblem?.slug}`
        : '/api/problems-with-coffee';
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { slug?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save problem.');
      }

      setStatusMessage(isEditing ? 'Problem updated successfully.' : 'Problem created successfully.');
      if (!isEditing) {
        setForm(emptyForm);
        setSlugTouched(false);
        setPreviewHtml('');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save problem.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProblem = async () => {
    if (!initialProblem) return;
    const confirmed = window.confirm(`Delete "${initialProblem.title}"?`);
    if (!confirmed) return;

    setIsSaving(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/problems-with-coffee/${initialProblem.slug}`, {
        method: 'DELETE',
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete problem.');
      }
      window.location.href = '/admin/problems-with-coffee';
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete problem.');
      setIsSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {isEditing ? 'Edit Coffee Problem' : 'Add Coffee Problem'}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Write concise mathematical problems with Markdown, images, and math.
          </p>
          <Link
            href="/admin/problems-with-coffee"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to Problems with Coffee admin
          </Link>
        </div>

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

          <div className="grid gap-4 sm:grid-cols-4">
            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Level</span>
              <select
                value={form.level}
                onChange={(event) =>
                  updateField('level', event.target.value as CoffeeProblemLevel)
                }
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

            <label className="block text-sm text-[var(--color-text-secondary)] sm:col-span-2">
              <span className="mb-1 block uppercase tracking-wide">Tags</span>
              <input
                value={form.tags}
                onChange={(event) => updateField('tags', event.target.value)}
                placeholder="pi, circle, geometry"
                className={inputClasses}
              />
            </label>
          </div>

          <label className="block text-sm text-[var(--color-text-secondary)]">
            <span className="mb-1 block uppercase tracking-wide">Cover Image URL</span>
            <input
              value={form.coverImage}
              onChange={(event) => updateField('coverImage', event.target.value)}
              placeholder="https://..."
              className={inputClasses}
            />
          </label>

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Upload Image</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Inserts Markdown into the focused editor field.
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setImageFile(event.target.files?.[0] ?? null)
                  }
                  className="max-w-full text-xs text-[var(--color-text-secondary)] file:mr-3 file:rounded file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#0f0e0d]"
                />
                <button
                  type="button"
                  onClick={uploadImage}
                  disabled={!imageFile || isUploadingImage}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-[#0f0e0d] disabled:opacity-50"
                >
                  <ImagePlus size={14} />
                  {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
            </div>
          </div>

          {fieldLabels.map(({ field, label, rows }) => (
            <label key={field} className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">{label}</span>
              <textarea
                ref={(element) => {
                  editorRefs.current[field] = element;
                }}
                value={form[field]}
                onFocus={() => setActiveField(field)}
                onChange={(event) => updateField(field, event.target.value)}
                rows={rows}
                className={`${inputClasses} min-h-28 resize-y font-mono text-xs leading-6 sm:text-sm`}
              />
            </label>
          ))}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => updateField('published', event.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              Published
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={renderPreview}
                disabled={isPreviewLoading}
                className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] disabled:opacity-50"
              >
                {isPreviewLoading ? 'Previewing...' : 'Preview Problem'}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  onClick={deleteProblem}
                  disabled={isSaving}
                  className="rounded-md border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Delete
                </button>
              ) : null}
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

          {previewHtml ? (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                Problem Preview
              </p>
              <div
                className="problem-content prose-academic"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          ) : null}
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
