'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { LibraryBook } from '@/types/library';

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

export default function RemoveBooksClient() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const response = await fetch('/api/books?pageSize=100', { cache: 'no-store' });
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

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">Remove Books</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            View all books and remove ones you no longer want in the library.
          </p>
          <Link
            href="/library/admin"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to admin dashboard
          </Link>
        </div>

        <div className="mb-6">
          {isLoadingBooks ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Loading books…</p>
          ) : books.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No books found.</p>
          ) : (
            <div className="space-y-3">
              {books.map((book) => (
                <div key={book.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-[var(--color-text)]">{book.title}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">{book.author}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        {book.fileName || (book.filePath ? 'Download ready' : 'No file')}
                        {book.filePath ? ` · ${book.fileSize ? formatFileSize(book.fileSize) : 'Size unknown'}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 sm:mt-0">
                      {book.filePath ? (
                        <a
                          href={`/api/books/${book.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-[var(--color-accent)]/30 px-3 py-1 text-xs text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/10"
                        >
                          Download
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleDelete(book)}
                        disabled={isSubmitting}
                        className="rounded-md border border-red-500/30 px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
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