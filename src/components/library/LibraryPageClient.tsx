'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileX,
  Library as LibraryIcon,
  Search,
  Settings,
  X,
} from 'lucide-react';
import Reveal from '@/components/visual/Reveal';
import MathMotif from '@/components/visual/MathMotif';
import GenerativeCover from '@/components/visual/GenerativeCover';
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
  return (
    book.coverUrl ||
    book.imageUrl ||
    book.cover_url ||
    book.thumbnailUrl ||
    book.cover ||
    ''
  );
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
  const downloadUrl = getBookDownloadUrl(book);
  const coverUrl = getBookCoverUrl(book);
  const category = getBookCategory(book);

  return (
    <article className="card-sheen group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] transition duration-200 ease-out hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--shadow-glow)] active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none motion-reduce:active:scale-100">
      {/* Cover: real image if present, else deterministic generative art */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--bg-subtle)]">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={book.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        ) : (
          <GenerativeCover
            seed={`${book.title}-${book.author ?? ''}`}
            label={category}
            className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        )}
        <span className="absolute left-2 top-2 inline-flex items-center rounded-[var(--radius-full)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
          {category}
        </span>
        {book.fileSize ? (
          <span className="absolute right-2 top-2 inline-flex items-center rounded-[var(--radius-full)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-subtle)]">
            {formatFileSize(book.fileSize)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-base leading-snug text-[var(--text)] transition-colors duration-150 group-hover:text-[var(--accent)]">
          {book.title}
        </h3>
        {book.author ? (
          <p className="mt-1 text-xs text-[var(--text-muted)]">{book.author}</p>
        ) : null}
        {book.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-subtle)]">
            {book.description}
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sheen inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </a>
          ) : (
            <span className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-3 text-sm text-[var(--text-subtle)]">
              <FileX className="h-4 w-4" aria-hidden="true" />
              No PDF
            </span>
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
    return Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
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
  const visibleBooks = filteredBooks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const hasActiveFilters = query.trim() !== '' || category !== 'All';

  const chipClass = (active: boolean) =>
    `inline-flex min-h-[36px] items-center rounded-[var(--radius-full)] border px-3.5 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${
      active
        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
    }`;

  return (
    <div className="mx-auto max-w-wide px-4 py-10 sm:px-6 md:py-14">
      {/* ===== Header ===== */}
      <header className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
        <div className="absolute inset-0 bg-hero-mesh" aria-hidden="true" />
        <MathMotif
          name="cayley"
          opacity={0.1}
          className="absolute -right-2 top-1/2 hidden h-[120%] -translate-y-1/2 sm:block"
        />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">My Favourite Books</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-[var(--text)] sm:text-5xl">
              Personal Library
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              {allBooks.length > 0
                ? `${allBooks.length} book${allBooks.length === 1 ? '' : 's'} across ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} — browse, explore, and download.`
                : 'A curated shelf of mathematics books — browse, explore, and download.'}
            </p>
          </div>

          {showAdminLink ? (
            <Link
              href="/library/admin"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Admin
            </Link>
          ) : null}
        </div>
      </header>

      {errorMessage ? (
        <p className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-muted)]">
          {errorMessage}
        </p>
      ) : null}

      {/* ===== Controls ===== */}
      {!isLoading && allBooks.length > 0 ? (
        <div className="mt-8 space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, author, or topic…"
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-9 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors duration-150 hover:border-[var(--border-strong)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-subtle)] transition-colors hover:text-[var(--text)]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('All')}
              className={chipClass(category === 'All')}
            >
              All ({allBooks.length})
            </button>
            {categories.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                className={chipClass(category === name)}
              >
                {name} ({count})
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--text-subtle)]">
              {filteredBooks.length === allBooks.length
                ? `Showing all ${allBooks.length} books`
                : `Found ${filteredBooks.length} of ${allBooks.length} books`}
            </p>
            <label className="flex items-center gap-2 text-xs text-[var(--text-subtle)]">
              Sort by
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--text)] focus-visible:border-[var(--accent)] focus-visible:outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="title">Title A–Z</option>
                <option value="author">Author A–Z</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {/* ===== Results ===== */}
      {isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="aspect-[3/4] w-full animate-pulse bg-[var(--surface-raised)]" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--surface-raised)]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--surface-raised)]" />
              </div>
            </div>
          ))}
        </div>
      ) : allBooks.length === 0 && !errorMessage ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-full)] bg-[var(--surface)] text-[var(--text-subtle)]">
            <LibraryIcon className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm text-[var(--text-muted)]">No books yet.</p>
          <p className="mt-1 text-xs text-[var(--text-subtle)]">
            Add books from the admin panel.
          </p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-full)] bg-[var(--surface)] text-[var(--text-subtle)]">
            <Search className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            No books match your search.
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('All');
              }}
              className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibleBooks.map((book, i) => (
              <Reveal
                key={`${book.title}-${book.author ?? ''}-${i}`}
                className="h-full"
                delay={(i % 4) * 60}
              >
                <BookCard book={book} />
              </Reveal>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={safePage <= 1}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.95] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label="Previous books page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="text-sm text-[var(--text-subtle)]">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.95] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label="Next books page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
