'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import SiteIcon from '@/components/ui/SiteIcon';
import type { LibraryBook } from '@/types/library';

type BooksPayload = {
  books: LibraryBook[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseBooksPayload(payload: unknown): BooksPayload {
  if (Array.isArray(payload)) {
    return {
      books: payload.filter(Boolean) as LibraryBook[],
      pagination: {
        page: 1,
        pageSize: payload.length,
        total: payload.length,
        totalPages: 1,
      },
    };
  }

  if (payload && typeof payload === 'object') {
    const value = payload as Partial<BooksPayload>;
    return {
      books: Array.isArray(value.books) ? value.books.filter(Boolean) : [],
      pagination: value.pagination,
    };
  }

  return { books: [] };
}

function BookCard({ book }: { book: LibraryBook }) {
  const [expanded, setExpanded] = useState(false);
  const shouldClamp = book.description && book.description.length > 120;

  return (
    <article className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 transition-colors hover:border-[var(--color-accent)]/50">
      <div className="grid grid-cols-[72px_1fr] gap-3 sm:block">
        <div className="relative aspect-[2/3] w-[72px] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg-muted)] sm:w-full">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt={`${book.title} cover`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center">
              <SiteIcon name="book" alt="" className="h-6 w-6 opacity-70" />
            </div>
          )}
        </div>

        <div className="min-w-0 sm:mt-2">
          <p className="mb-1 inline-flex max-w-full rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
            <span className="truncate">{book.category}</span>
          </p>
          <h2 className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--color-text)]">
            {book.title}
          </h2>
          <p className="mt-1 truncate text-[11px] text-[var(--color-accent)]">{book.author}</p>

          {book.description ? (
            <div className="mt-1.5 text-[11px] leading-5 text-[var(--color-text-secondary)]">
              <p className={expanded ? '' : 'line-clamp-2'}>{book.description}</p>
              {shouldClamp ? (
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]"
                >
                  {expanded ? 'Less' : 'More'}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2">
            {book.filePath ? (
              <a
                href={`/api/books/${book.id}/download`}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] px-2 text-[11px] font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90"
              >
                <SiteIcon name="download" alt="" className="h-3.5 w-3.5" />
                Download
                {book.fileSize ? (
                  <span className="font-medium opacity-70">({formatFileSize(book.fileSize)})</span>
                ) : null}
              </a>
            ) : (
              <div className="flex h-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[11px] text-[var(--color-text-tertiary)]">
                No file
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function LibraryPageClient({
  showAdminLink = false,
}: {
  showAdminLink?: boolean;
}) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const pageSize = 10;

  useEffect(() => {
    let ignore = false;

    const loadBooks = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });

        const response = await fetch(`/api/books?${params.toString()}`, { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof (payload as { error?: unknown }).error === 'string'
              ? String((payload as { error: string }).error)
              : 'Failed to load books.';
          throw new Error(message);
        }

        const parsed = parseBooksPayload(payload);
        if (!ignore) {
          setBooks(parsed.books);
          setTotalPages(parsed.pagination?.totalPages ?? 1);
        }
      } catch (error) {
        if (!ignore) {
          setBooks([]);
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : 'Unable to load books right now.',
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    void loadBooks();
    return () => {
      ignore = true;
    };
  }, [page]);

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-6xl px-3 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-5">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <SiteIcon name="library" alt="" className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                My Favourite Books
              </p>
            </div>
            <h1
              className="text-2xl font-semibold leading-tight text-[var(--color-text)] sm:text-3xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Personal Library
            </h1>
          </div>

          {showAdminLink ? (
            <Link
              href="/library/admin"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Admin
              <SiteIcon name="external-link" alt="" className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-md border border-red-500/30 bg-red-950/20 px-4 py-3 text-xs text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: pageSize }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5"
              >
                <div className="aspect-[2/3] animate-pulse rounded-md bg-[var(--color-bg-muted)]" />
                <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-[var(--color-bg-muted)]" />
                <div className="mt-2 h-2 w-1/2 animate-pulse rounded bg-[var(--color-bg-muted)]" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
            <SiteIcon name="book" alt="" className="mx-auto mb-3 h-8 w-8 opacity-65" />
            <p className="text-sm font-medium text-[var(--color-text)]">
              No books yet.
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Add books from the admin panel.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous books page"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs text-[var(--color-text-secondary)]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next books page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
