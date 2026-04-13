'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PRESET_CATEGORIES } from '@/lib/library-categories';
import type { LibraryBook, LibraryStats } from '@/types/library';

const THEME_STORAGE_KEY = 'library-theme';
const ALL_CATEGORIES_LABEL = 'All';

function formatFileSize(bytes: number): string {
  if (!bytes) {
    return 'No file';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString();
}

function parseBooks(payload: unknown): LibraryBook[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter(Boolean) as LibraryBook[];
}

export default function LibraryPageClient() {
  const [isDark, setIsDark] = useState(true);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [categories, setCategories] = useState<string[]>([...PRESET_CATEGORIES]);
  const [stats, setStats] = useState<LibraryStats>({
    totalBooks: 0,
    categoriesCount: PRESET_CATEGORIES.length,
  });

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES_LABEL);

  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    setIsDark(savedTheme !== 'light');
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const categoryOptions = useMemo(() => {
    const merged = Array.from(
      new Set([
        ...PRESET_CATEGORIES,
        ...categories.map((value) => value.trim()).filter(Boolean),
      ]),
    );

    return [ALL_CATEGORIES_LABEL, ...merged];
  }, [categories]);

  useEffect(() => {
    let ignore = false;

    const loadMeta = async () => {
      try {
        const [categoriesResponse, statsResponse] = await Promise.all([
          fetch('/api/categories', { cache: 'no-store' }),
          fetch('/api/books/stats', { cache: 'no-store' }),
        ]);

        if (!categoriesResponse.ok || !statsResponse.ok) {
          throw new Error('Failed to load library metadata.');
        }

        const categoriesPayload = (await categoriesResponse.json()) as unknown;
        const statsPayload = (await statsResponse.json()) as LibraryStats;

        if (!ignore) {
          if (Array.isArray(categoriesPayload)) {
            setCategories(categoriesPayload as string[]);
          }

          setStats({
            totalBooks: Number(statsPayload.totalBooks ?? 0),
            categoriesCount: Number(statsPayload.categoriesCount ?? 0),
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!ignore) {
          setIsLoadingMeta(false);
        }
      }
    };

    void loadMeta();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoadingBooks(true);
      setErrorMessage('');

      try {
        const params = new URLSearchParams();

        if (search.trim()) {
          params.set('search', search.trim());
        }

        if (selectedCategory !== ALL_CATEGORIES_LABEL) {
          params.set('category', selectedCategory);
        }

        const query = params.toString();
        const endpoint = query ? `/api/books?${query}` : '/api/books';
        const response = await fetch(endpoint, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load books.');
        }

        const payload = (await response.json()) as unknown;
        setBooks(parseBooks(payload));
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }

        console.error(error);
        setErrorMessage('Unable to load books right now. Please try again.');
      } finally {
        setIsLoadingBooks(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search, selectedCategory]);

  return (
    <div className={isDark ? 'dark' : ''}>
      <section className="min-h-screen bg-[#f5f2ed] text-[#171614] transition-colors duration-300 dark:bg-[#171614] dark:text-[#e8e0d4]">
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7a4d] dark:text-[#c9a84c]">
                My Personal Collection
              </p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
                My Library
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/library/admin"
                className="rounded-full border border-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#c9a84c] transition hover:bg-[#c9a84c] hover:text-[#171614]"
              >
                Admin
              </Link>
              <button
                type="button"
                onClick={() => setIsDark((prev) => !prev)}
                className="rounded-full border border-[#c9a84c] bg-transparent px-4 py-2 text-sm font-semibold text-[#c9a84c] transition hover:bg-[#c9a84c] hover:text-[#171614]"
              >
                {isDark ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#d8c9ab] bg-white/90 p-4 dark:border-[#3b3529] dark:bg-[#1e1d1b]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7d6f54] dark:text-[#9f8a58]">Books</p>
              <p className="mt-2 text-2xl font-bold text-[#171614] dark:text-[#e8e0d4]">{stats.totalBooks}</p>
            </div>
            <div className="rounded-2xl border border-[#d8c9ab] bg-white/90 p-4 dark:border-[#3b3529] dark:bg-[#1e1d1b]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7d6f54] dark:text-[#9f8a58]">Categories</p>
              <p className="mt-2 text-2xl font-bold text-[#171614] dark:text-[#e8e0d4]">
                {isLoadingMeta ? '...' : stats.categoriesCount}
              </p>
            </div>
            <div className="rounded-2xl border border-[#d8c9ab] bg-white/90 p-4 dark:border-[#3b3529] dark:bg-[#1e1d1b]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7d6f54] dark:text-[#9f8a58]">Theme</p>
              <p className="mt-2 text-2xl font-bold text-[#171614] dark:text-[#e8e0d4]">
                {isDark ? 'Dark' : 'Light'}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[#d8c9ab] bg-white/90 p-4 dark:border-[#3b3529] dark:bg-[#1e1d1b]">
            <label htmlFor="library-search" className="text-sm font-semibold text-[#6f6147] dark:text-[#cab98b]">
              Search books
            </label>
            <input
              id="library-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, author, or category"
              className="mt-2 w-full rounded-xl border border-[#cfc2a7] bg-[#fdfbf7] px-4 py-2 text-sm text-[#171614] outline-none transition placeholder:text-[#8b7d61] focus:border-[#c9a84c] dark:border-[#3b3529] dark:bg-[#242321] dark:text-[#e8e0d4] dark:placeholder:text-[#9e9177]"
            />

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {categoryOptions.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-[#c9a84c] bg-[#c9a84c] text-[#171614]'
                        : 'border-[#c6b89a] text-[#6b5f47] hover:border-[#c9a84c] hover:text-[#c9a84c] dark:border-[#3b3529] dark:text-[#b8ab92]'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-red-400/60 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage}
            </div>
          ) : null}

          {isLoadingBooks ? (
            <p className="mt-8 text-sm text-[#766950] dark:text-[#b8ab92]">Loading books...</p>
          ) : books.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[#c7b99b] p-8 text-center text-sm text-[#766950] dark:border-[#3f382b] dark:text-[#b8ab92]">
              No books found for this filter.
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => (
                <article
                  key={book.id}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#d8c9ab] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-[#3b3529] dark:bg-[#1e1d1b]"
                >
                  <div className="aspect-[4/5] w-full bg-[#ece3d4] dark:bg-[#2a2723]">
                    {book.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.coverUrl}
                        alt={`${book.title} cover`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.16em] text-[#8b7d61] dark:text-[#9e9177]">
                        No Cover
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="text-lg font-bold leading-tight text-[#171614] dark:text-[#e8e0d4]">{book.title}</h2>
                    <p className="mt-1 text-sm text-[#6f6147] dark:text-[#cdbf9f]">{book.author}</p>
                    <span className="mt-3 inline-flex w-fit rounded-full bg-[#f2eadc] px-2.5 py-1 text-xs font-semibold text-[#6f6147] dark:bg-[#2e2a25] dark:text-[#cab98b]">
                      {book.category}
                    </span>

                    <p className="mt-3 min-h-[60px] text-sm leading-relaxed text-[#5a503e] dark:text-[#b7ab94]">
                      {book.description || 'No description provided.'}
                    </p>

                    <div className="mt-4 space-y-1 text-xs text-[#7b6e53] dark:text-[#aa9c81]">
                      <p>File: {book.fileName || 'Not uploaded'}</p>
                      <p>Size: {formatFileSize(book.fileSize)}</p>
                      <p>Added: {formatDate(book.addedAt)}</p>
                    </div>

                    {book.filePath ? (
                      <a
                        href={`/api/books/${book.id}/download`}
                        className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#171614] transition hover:brightness-95"
                      >
                        Download
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="mt-4 rounded-xl border border-[#cab98b] px-4 py-2 text-sm font-semibold text-[#9f8f6d] opacity-80 dark:border-[#4a4337] dark:text-[#8d8068]"
                      >
                        File missing
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
