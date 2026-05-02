'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import type { LibraryBook } from '@/types/library';

type AdminFormState = {
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  fileUrl: string;
};

const initialFormState: AdminFormState = {
   title: '',
   author: '',
   description: '',
   coverUrl: '',
   fileUrl: '',
};

const LIBRARY_FILE_ACCEPT = '.pdf,.epub,.djvu,.mobi,.azw,.azw3,.txt,.doc,.docx';

function parseBooks(payload: unknown): LibraryBook[] {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    Array.isArray((payload as { books?: unknown }).books)
  ) {
    return (payload as { books: LibraryBook[] }).books.filter(Boolean);
  }

  if (!Array.isArray(payload)) return [];
  return payload.filter(Boolean) as LibraryBook[];
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LibraryAdminClient() {
  const [form, setForm] = useState<AdminFormState>(initialFormState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const response = await fetch('/api/books?pageSize=50', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load books.');
      const payload = (await response.json()) as unknown;
      setBooks(parseBooks(payload));
    } catch (error) {
      console.error(error);
      setErrorMessage('Unable to load books from API.');
    } finally {
      setIsLoadingBooks(false);
    }
  };

  useEffect(() => {
    void loadBooks();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
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

      const response = await fetch('/api/books', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to add book.');
      }

      setStatusMessage('Book added successfully.');
      setForm(initialFormState);
      setSelectedFile(null);

      const fileInput = document.getElementById('library-admin-file') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';

      await loadBooks();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (book: LibraryBook) => {
    const confirmed = window.confirm(`Delete "${book.title}"?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete book.');
      }

      setStatusMessage(`Deleted: ${book.title}`);
      await loadBooks();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30';

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">Library Admin</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Simple controls to add books and manage library entries.
          </p>
          <Link
            href="/library"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to library
          </Link>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">Add New Book</h2>

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
                accept={LIBRARY_FILE_ACCEPT}
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)]"
              />
              {selectedFile ? (
                <div className="mt-2 max-w-full overflow-x-auto px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                  {selectedFile.name}
                </div>
              ) : null}
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
              {isSubmitting ? 'Saving...' : 'Add Book'}
            </button>
          </div>
        </form>

        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-[var(--color-text)]">Books</h2>
          {isLoadingBooks ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Loading books…</p>
          ) : books.length === 0 ? null : (
            <div className="space-y-3">
              {books.map((book) => (
                <div key={book.id} className="py-3 border-b border-[var(--color-border)] last:border-b-0">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-sm text-[var(--color-text)]">{book.title}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{book.author}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">
                      {book.fileName || (book.filePath ? 'Download ready' : 'No file')}
                      {book.filePath ? ` · ${book.fileSize ? formatFileSize(book.fileSize) : 'Size unknown'}` : ''}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {book.filePath ? (
                      <a
                        href={`/api/books/${book.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-accent)] hover:underline"
                      >
                        Open download
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDelete(book)}
                      disabled={isSubmitting}
                      className="rounded-md border border-red-500/30 px-3 py-1 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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

