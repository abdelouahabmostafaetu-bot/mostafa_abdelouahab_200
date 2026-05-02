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

export default function EditBooksClient() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

  const loadBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const response = await fetch('/api/books?pageSize=100', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load books.');
      const payload = (await response.json()) as unknown;
      setBooks(parseBooks(payload));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  useEffect(() => {
    void loadBooks();
  }, []);

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">Edit Books</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Select a book to edit its information.
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
                      <Link
                        href={`/library/admin/edit/${book.id}`}
                        className="rounded-md border border-blue-500/30 px-3 py-1 text-xs text-blue-400 transition hover:bg-blue-500/10"
                      >
                        Edit
                      </Link>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}