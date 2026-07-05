'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import SiteIcon from '@/components/ui/SiteIcon';
import type { LibraryBook } from '@/types/library';

const PAGE_SIZE = 12;

type BooksPayload = {
  books: LibraryBook[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type SortOption = 'newest' | 'title' | 'author';

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

function getBookDownloadUrl(book: LibraryBook): string {
  return book.pdfUrl || book.fileUrl || book.pdf_url || book.downloadUrl || '';
}

function getBookCoverUrl(book: LibraryBook): string {
  return book.coverUrl || book.imageUrl || book.cover_url || book.thumbnailUrl || book.cover || '';
}

function getBookCategory(book: LibraryBook): string {
  return (book.category || '').trim() || 'General';
}

function getBookTimestamp(book: LibraryBook): number {
  const raw = book.addedAt || book.createdAt || book.updatedAt || '';
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function BookCard({ book }: { book: LibraryBook }) {
  const [expanded, setExpanded] = useState(false);
  const shouldClamp = Boolean(book.description && book.description.length > 110);
  const downloadUrl = getBookDownloadUrl(book);
  const coverUrl = getBookCoverUrl(book);
  const category = getBookCategory(book);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-accent)]/60 hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
      <div className="relative aspect-[2/3] overflow-hidden bg-[var(--color-bg-muted)]">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#2a2119] via-[#211b16] to-[#3b2d1c] p-3 text-center">
            <SiteIcon name="book" alt="" className="h-6 w-6 opacity-80" />
            <span className="line-clamp-4 font-serif text-xs leading-snug text-[var(--color-text)]">
              {book.title}
            </span>
            <span className="line-clamp-1 text-[10px] text-[var(--color-text-tertiary)]">
              {book.author}
            </span>
          </div>
        )}

        <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-accent-light)] backdrop-blur-sm">
          {category}
        </span>

        {book.fileSize ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-medium text-[var(--color-text-secondary)] backdrop-blur-sm">
            {formatFileSize(book.fileSize)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h2 className="line-clamp-2 font-serif text-[15px] font-medium leading-snug text-[var(--color-text)]">
          {book.title}
        </h2>
        <p className="mt-1 truncate text-[11.5px] text-[var(--color-accent)]">{book.author}</p>

        {book.description ? (
          <div className="mt-1.5 text-[11.5px] leading-5 text-[var(--color-text-secondary)]">
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

        <div className="mt-auto pt-2.5">
          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] px-2 text-[11px] font-semibold text-[#161311] transition-opacity hover:opacity-90"
            >
              <SiteIcon name="download" alt="" className="h-3.5 w-3.5" />
              Download
            </a>
          ) : (
            <div className="flex h-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[11px] text-[var(--color-text-tertiary)]">
              No PDF
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function LibraryPageClient({
  showAdminLink = false,
}: {
  showAdminLink?: boolean;
  isSignedIn?: boolean;
}) {
  const [allBooks, setAllBooks] = useState<LibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let ignore = false;

    const loadBooks = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const collected: LibraryBook[] = [];
        let currentPage = 1;
        let apiTotalPages = 1;

        do {
          const params = new URLSearchParams({
            page: String(currentPage),
            pageSize: '100',
          });

          const response = await fetch(`/api/library/books?${params.toString()}`, {
            cache: 'no-store',
          });
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
          collected.push(...parsed.books);
          apiTotalPages = parsed.pagination?.totalPages ?? 1;
          currentPage += 1;
        } while (currentPage <= apiTotalPages && currentPage <= 10);

        if (!ignore) setAllBooks(collected);
      } catch (error) {
        if (!ignore) {
          setAllBooks([]);
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
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of allBooks) {
      const key = getBookCategory(book);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allBooks]);

  const filteredBooks = useMemo(() => {
    const term = query.trim().toLowerCase();

    const matches = allBooks.filter((book) => {
      if (category !== 'All' && getBookCategory(book) !== category) return false;
      if (!term) return true;

      const haystack = [
        book.title,
        book.author,
        book.description,
        getBookCategory(book),
        ...(Array.isArray(book.tags) ? book.tags : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });

    const sorted = [...matches];
    if (sortBy === 'title') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'author') {
      sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    } else {
      sorted.sort((a, b) => getBookTimestamp(b) - getBookTimestamp(a));
    }

    return sorted;
  }, [allBooks, query, category, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [query, category, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleBooks = filteredBooks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasActiveFilters = query.trim() !== '' || category !== 'All';

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <SiteIcon name="library" alt="" className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                My Favourite Books
              </p>
            </div>
            <h1 className="font-serif text-3xl font-normal leading-tight text-[var(--color-text)] sm:text-4xl">
              Personal Library
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {allBooks.length > 0
                ? `${allBooks.length} book${allBooks.length === 1 ? '' : 's'} across ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} — browse, explore, and download.`
                : 'A curated shelf of mathematics books — browse, explore, and download.'}
            </p>
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

        {!isLoading && allBooks.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
              />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, author, or topic…"
                className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-9 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)]"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory('All')}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  category === 'All'
                    ? 'border-[var(--color-accent)] bg-[rgba(217,162,74,0.14)] text-[var(--color-text)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/60 hover:text-[var(--color-text)]'
                }`}
              >
                All ({allBooks.length})
              </button>
              {categories.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    category === name
                      ? 'border-[var(--color-accent)] bg-[rgba(217,162,74,0.14)] text-[var(--color-text)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/60 hover:text-[var(--color-text)]'
                  }`}
                >
                  {name} ({count})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--color-text-secondary)]">
                {filteredBooks.length === allBooks.length
                  ? `Showing all ${allBooks.length} books`
                  : `Found ${filteredBooks.length} of ${allBooks.length} books`}
              </p>
              <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                Sort by
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                >
                  <option value="newest">Newest first</option>
                  <option value="title">Title A–Z</option>
                  <option value="author">Author A–Z</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="aspect-[2/3] animate-pulse bg-[var(--color-bg-muted)]" />
                <div className="p-3">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--color-bg-muted)]" />
                  <div className="mt-2 h-2 w-1/2 animate-pulse rounded bg-[var(--color-bg-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : allBooks.length === 0 && !errorMessage ? (
          <div className="mt-12 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-14 text-center">
            <SiteIcon name="book" alt="" className="mx-auto mb-3 h-8 w-8 opacity-65" />
            <p className="text-sm font-medium text-[var(--color-text)]">No books yet.</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Add books from the admin panel.
            </p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
            <SiteIcon name="search" alt="" className="mx-auto mb-3 h-7 w-7 opacity-65" />
            <p className="text-sm font-medium text-[var(--color-text)]">
              No books match your search.
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <X size={12} />
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {visibleBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous books page"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={safePage >= totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next books page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
