'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import type { LibraryBook } from '@/types/library';

type AdminFormState = {
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  fileUrl: string;
};

export default function EditBookClient({ bookId }: { bookId: string }) {
  const [form, setForm] = useState<AdminFormState>({
    title: '',
    author: '',
    description: '',
    coverUrl: '',
    fileUrl: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [book, setBook] = useState<LibraryBook | null>(null);

  const loadBook = useCallback(async () => {
    try {
      const response = await fetch(`/api/books/${bookId}`);
      if (!response.ok) throw new Error('Failed to load book.');
      const bookData = (await response.json()) as LibraryBook;
      setBook(bookData);
      setForm({
        title: bookData.title,
        author: bookData.author,
        description: bookData.description,
        coverUrl: bookData.coverUrl,
        fileUrl: bookData.filePath.startsWith('http') ? bookData.filePath : '',
      });
    } catch (error) {
      setErrorMessage('Failed to load book for editing.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    void loadBook();
  }, [loadBook]);

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('author', form.author);
      formData.append('description', form.description);
      formData.append('coverUrl', form.coverUrl);
      formData.append('fileUrl', form.fileUrl);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update book.');
      }

      setStatusMessage('Book updated successfully.');
      setSelectedFile(null);

      const fileInput = document.getElementById('library-admin-file') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';

      // Reload the book data
      await loadBook();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30';

  if (isLoading) {
    return (
      <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="mb-8 border-b border-[var(--color-border)] pb-6">
            <h1 className="text-3xl font-semibold text-[var(--color-text)]">Edit Book</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Loading book information...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!book) {
    return (
      <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="mb-8 border-b border-[var(--color-border)] pb-6">
            <h1 className="text-3xl font-semibold text-[var(--color-text)]">Edit Book</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Book not found.
            </p>
            <Link
              href="/library/admin/edit"
              className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
            >
              Back to edit books
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">Edit Book</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Edit information for {book.title}
          </p>
          <Link
            href="/library/admin/edit"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to edit books
          </Link>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-[var(--color-text-secondary)]">
                <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Title</span>
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
                <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Author</span>
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
              <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Description</span>
              <textarea
                id="library-admin-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                rows={3}
                className={`${inputClasses} resize-none`}
              />
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Cover Image URL</span>
              <input
                id="library-admin-cover-url"
                type="url"
                value={form.coverUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, coverUrl: e.target.value }))}
                placeholder="https://..."
                className={inputClasses}
              />
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Book File</span>
              <input
                id="library-admin-file"
                type="file"
                accept=".pdf,.epub,.djvu,.mobi,.azw,.azw3,.txt,.doc,.docx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)]"
              />
              {selectedFile ? (
                <div className="mt-2 max-w-full overflow-x-auto px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                  {selectedFile.name}
                </div>
              ) : book.fileName ? (
                <div className="mt-2 px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                  Current file: {book.fileName}
                </div>
              ) : (
                <div className="mt-2 px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                  No file chosen
                </div>
              )}
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Direct Download Link</span>
              <input
                id="library-admin-file-url"
                type="url"
                value={form.fileUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
                placeholder="https://example.com/book.pdf"
                className={inputClasses}
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Update Book'}
            </button>
          </div>
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
