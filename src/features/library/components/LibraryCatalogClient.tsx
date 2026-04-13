'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, Download, ExternalLink } from 'lucide-react';
import type { LibraryBook } from '@/features/library/types/library';

function formatFileSize(bytes: number): string {
  if (!bytes) return 'No file';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseBooks(payload: unknown): LibraryBook[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter(Boolean) as LibraryBook[];
}

export default function LibraryCatalogClient() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadBooks = async () => {
      try {
        const response = await fetch('/api/books', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | LibraryBook[]
          | null;

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === 'object' &&
            !Array.isArray(payload) &&
            typeof payload.error === 'string'
              ? payload.error
              : 'Failed to load books.';
          throw new Error(message);
        }

        if (!ignore) {
          setBooks(parseBooks(payload));
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : 'Unable to load books right now.';
          setErrorMessage(message);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    void loadBooks();
    return () => { ignore = true; };
  }, []);

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} className="text-[var(--color-accent)]" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                My Favourite Books
              </p>
            </div>
            <h1
              className="text-3xl font-bold leading-tight sm:text-4xl text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Personal Library
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-lg">
              A curated collection of books that have shaped my mathematical journey and thinking.
            </p>
          </div>

          <Link
            href="/library/admin"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Admin
          </Link>
        </div>

        {/* Error state */}
        {errorMessage ? (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-950/20 px-5 py-4 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {/* Loading state */}
        {isLoading ? (
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-1 animate-pulse"
              >
                <div className="aspect-[3/4] rounded-xl bg-[var(--color-bg-elevated)]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[var(--color-bg-elevated)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--color-bg-elevated)] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          /* Empty state */
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-12 max-w-md">
              <BookOpen size={40} className="mx-auto text-[var(--color-text-tertiary)] mb-4" />
              <p className="text-lg font-medium text-[var(--color-text)]">No books yet</p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Your library is empty. Add books from the admin panel.
              </p>
              <Link
                href="/library/admin"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[#0f0e0d] transition hover:opacity-90"
              >
                Go to Admin
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        ) : (
          /* Books grid */
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <article
                key={book.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] transition-all duration-300 hover:border-[var(--color-accent)]/40 hover:shadow-[0_0_30px_rgba(79,152,163,0.06)]"
              >
                {/* Cover */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--color-bg-elevated)]">
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverUrl}
                      alt={`${book.title} cover`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
                      <BookOpen size={32} className="text-[var(--color-text-tertiary)]" />
                      <span className="text-center text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                        {book.title}
                      </span>
                    </div>
                  )}

                  {/* Category badge */}
                  <span className="absolute top-3 left-3 rounded-md bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                    {book.category}
                  </span>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-base font-bold leading-snug text-[var(--color-text)] line-clamp-2">
                    {book.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-accent)]">
                    {book.author}
                  </p>

                  {book.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)] line-clamp-3">
                      {book.description}
                    </p>
                  ) : null}

                  <div className="mt-auto pt-4">
                    {book.filePath ? (
                      <a
                        href={`/api/books/${book.id}/download`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-all hover:opacity-90"
                      >
                        <Download size={14} />
                        Download
                        {book.fileSize ? (
                          <span className="text-xs opacity-70">
                            ({formatFileSize(book.fileSize)})
                          </span>
                        ) : null}
                      </a>
                    ) : (
                      <div className="flex items-center justify-center rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text-tertiary)]">
                        No file available
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
