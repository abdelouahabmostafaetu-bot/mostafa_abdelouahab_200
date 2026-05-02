'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

type AdminFormState = {
  title: string;
  author: string;
  description: string;
  tags: string;
  category: string;
};

type UploadedBlob = {
  url: string;
  pathname: string;
  filename: string;
  size: number;
  contentType: string;
};

const initialFormState: AdminFormState = {
  title: '',
  author: '',
  description: '',
  tags: '',
  category: '',
};

const PDF_ACCEPT = '.pdf,application/pdf';
const COVER_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp';

async function uploadBlobFile(endpoint: string, file: File): Promise<UploadedBlob> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | (Partial<UploadedBlob> & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Upload failed.');
  }

  if (
    !payload?.url ||
    !payload.pathname ||
    !payload.filename ||
    typeof payload.size !== 'number' ||
    !payload.contentType
  ) {
    throw new Error('Upload response was incomplete.');
  }

  return {
    url: payload.url,
    pathname: payload.pathname,
    filename: payload.filename,
    size: payload.size,
    contentType: payload.contentType,
  };
}

export default function AddBookClient() {
  const [form, setForm] = useState<AdminFormState>(initialFormState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');
    setUploadStage('');

    try {
      if (!selectedFile) {
        throw new Error('Choose a PDF file before saving.');
      }

      setUploadStage('Uploading PDF...');
      const uploadedFile = await uploadBlobFile('/api/library/upload-book-file', selectedFile);

      let uploadedCover: UploadedBlob | null = null;
      if (selectedCover) {
        setUploadStage('Uploading cover...');
        uploadedCover = await uploadBlobFile('/api/library/upload-cover', selectedCover);
      }

      setUploadStage('Saving metadata...');
      const response = await fetch('/api/library/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          author: form.author,
          description: form.description,
          tags: form.tags,
          category: form.category,
          file: uploadedFile,
          cover: uploadedCover,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save book metadata.');
      }

      setStatusMessage('Book added successfully.');
      setForm(initialFormState);
      setSelectedFile(null);
      setSelectedCover(null);

      const fileInput = document.getElementById('library-admin-file') as HTMLInputElement | null;
      const coverInput = document.getElementById('library-admin-cover') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      if (coverInput) coverInput.value = '';
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setUploadStage('');
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30';
  const fileInputClasses =
    'block w-full max-w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#0f0e0d]';

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-2xl font-semibold text-[var(--color-text)] sm:text-3xl">
            Add New Book
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Upload the PDF to Blob, then save only the book metadata in MongoDB.
          </p>
          <Link
            href="/library/admin"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to admin dashboard
          </Link>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Title</span>
              <input
                id="library-admin-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Book title"
                required
                className={inputClasses}
              />
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Author</span>
              <input
                id="library-admin-author"
                value={form.author}
                onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                placeholder="Author name"
                required
                className={inputClasses}
              />
            </label>
          </div>

          <label className="block text-sm text-[var(--color-text-secondary)]">
            <span className="mb-1 block uppercase tracking-wide">Description</span>
            <textarea
              id="library-admin-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description"
              rows={4}
              className={`${inputClasses} resize-none`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Category</span>
              <input
                id="library-admin-category"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="Mathematics"
                className={inputClasses}
              />
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Tags</span>
              <input
                id="library-admin-tags"
                value={form.tags}
                onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="analysis, topology"
                className={inputClasses}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0 text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">PDF File</span>
              <input
                id="library-admin-file"
                type="file"
                accept={PDF_ACCEPT}
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className={fileInputClasses}
              />
              <span className="mt-2 block max-w-full break-words text-xs text-[var(--color-text-tertiary)]">
                {selectedFile ? selectedFile.name : 'PDF only, up to 30 MB.'}
              </span>
            </label>

            <label className="block min-w-0 text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Cover Image</span>
              <input
                id="library-admin-cover"
                type="file"
                accept={COVER_ACCEPT}
                onChange={(e) => setSelectedCover(e.target.files?.[0] ?? null)}
                className={fileInputClasses}
              />
              <span className="mt-2 block max-w-full break-words text-xs text-[var(--color-text-tertiary)]">
                {selectedCover ? selectedCover.name : 'Optional PNG, JPG, or WEBP up to 4 MB.'}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? uploadStage || 'Saving...' : 'Save Book'}
          </button>
        </form>

        {statusMessage ? (
          <div className="mt-6 border-l-4 border-emerald-500/60 bg-[var(--color-bg)]/90 px-4 py-3 text-sm text-emerald-300">
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 border-l-4 border-red-500/60 bg-[var(--color-bg)]/90 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
