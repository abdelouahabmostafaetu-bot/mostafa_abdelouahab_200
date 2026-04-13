'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import { PRESET_CATEGORIES } from '@/lib/library-categories';
import type { LibraryBook } from '@/types/library';

const ADMIN_PASSWORD = 'library2024';
const THEME_STORAGE_KEY = 'library-theme';

type AdminFormState = {
  title: string;
  author: string;
  category: string;
  description: string;
  coverUrl: string;
};

const initialFormState: AdminFormState = {
  title: '',
  author: '',
  category: PRESET_CATEGORIES[0],
  description: '',
  coverUrl: '',
};

function parseBooks(payload: unknown): LibraryBook[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter(Boolean) as LibraryBook[];
}

function formatFileSize(bytes: number): string {
  if (!bytes) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LibraryAdminClient() {
  const [isDark, setIsDark] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [form, setForm] = useState<AdminFormState>(initialFormState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    setIsDark(savedTheme !== 'light');
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const loadBooks = async () => {
    setIsLoadingBooks(true);

    try {
      const response = await fetch('/api/books', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load books.');
      }

      const payload = (await response.json()) as unknown;
      setBooks(parseBooks(payload).slice(0, 12));
    } catch (error) {
      console.error(error);
      setErrorMessage('Unable to load books from API.');
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (passwordInput !== ADMIN_PASSWORD) {
      setErrorMessage('Invalid admin password.');
      setStatusMessage('');
      return;
    }

    setIsAuthorized(true);
    setErrorMessage('');
    setStatusMessage('Access granted. You can now manage your library.');
    void loadBooks();
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthorized) {
      setErrorMessage('You are not authorized.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const formData = new FormData();
      formData.append('password', passwordInput);
      formData.append('title', form.title);
      formData.append('author', form.author);
      formData.append('category', form.category);
      formData.append('description', form.description);
      formData.append('coverUrl', form.coverUrl);

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
      if (fileInput) {
        fileInput.value = '';
      }

      await loadBooks();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (book: LibraryBook) => {
    const confirmed = window.confirm(`Delete "${book.title}"?`);
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: passwordInput,
        }),
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
    <div className={isDark ? 'dark' : ''}>
      <section className="min-h-screen bg-[#f5f2ed] text-[#171614] transition-colors duration-300 dark:bg-[#171614] dark:text-[#e8e0d4]">
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7a4d] dark:text-[#c9a84c]">
                Secure Admin
              </p>
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Library Admin</h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/library"
                className="rounded-full border border-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#c9a84c] transition hover:bg-[#c9a84c] hover:text-[#171614]"
              >
                Public library
              </Link>
              <button
                type="button"
                onClick={() => setIsDark((prev) => !prev)}
                className="rounded-full border border-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#c9a84c] transition hover:bg-[#c9a84c] hover:text-[#171614]"
              >
                {isDark ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </div>

          {!isAuthorized ? (
            <form
              onSubmit={handleUnlock}
              className="mt-8 max-w-md rounded-2xl border border-[#d8c9ab] bg-white/90 p-5 shadow-sm dark:border-[#3b3529] dark:bg-[#1e1d1b]"
            >
              <label htmlFor="library-admin-password" className="text-sm font-semibold text-[#6f6147] dark:text-[#cab98b]">
                Admin password
              </label>
              <input
                id="library-admin-password"
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#cfc2a7] bg-[#fdfbf7] px-4 py-2 text-sm text-[#171614] outline-none transition focus:border-[#c9a84c] dark:border-[#3b3529] dark:bg-[#242321] dark:text-[#e8e0d4]"
                placeholder="Enter admin password"
                required
              />
              <button
                type="submit"
                className="mt-4 w-full rounded-xl bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#171614] transition hover:brightness-95"
              >
                Unlock admin page
              </button>
              <p className="mt-3 text-xs text-[#6f6147] dark:text-[#b9ad97]">
                API routes also validate this password before any write/delete operation.
              </p>
            </form>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <form
                onSubmit={handleCreate}
                className="rounded-2xl border border-[#d8c9ab] bg-white/90 p-5 shadow-sm dark:border-[#3b3529] dark:bg-[#1e1d1b]"
              >
                <h2 className="text-lg font-bold">Add a new book</h2>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Title"
                    required
                    className="rounded-xl border border-[#cfc2a7] bg-[#fdfbf7] px-4 py-2 text-sm outline-none transition focus:border-[#c9a84c] dark:border-[#3b3529] dark:bg-[#242321]"
                  />
                  <input
                    value={form.author}
                    onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
                    placeholder="Author"
                    required
                    className="rounded-xl border border-[#cfc2a7] bg-[#fdfbf7] px-4 py-2 text-sm outline-none transition focus:border-[#c9a84c] dark:border-[#3b3529] dark:bg-[#242321]"
                  />
                </div>

                <select
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="mt-3 w-full rounded-xl border border-[#cfc2a7] bg-[#fdfbf7] px-4 py-2 text-sm outline-none transition focus:border-[#c9a84c] dark:border-[#3b3529] dark:bg-[#242321]"
                >
                  {PRESET_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Description"
                  rows={4}
                  className="mt-3 w-full rounded-xl border border-[#cfc2a7] bg-[#fdfbf7] px-4 py-2 text-sm outline-none transition focus:border-[#c9a84c] dark:border-[#3b3529] dark:bg-[#242321]"
                />

                <input
                  type="url"
                  value={form.coverUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, coverUrl: event.target.value }))}
                  placeholder="Cover image URL"
                  className="mt-3 w-full rounded-xl border border-[#cfc2a7] bg-[#fdfbf7] px-4 py-2 text-sm outline-none transition focus:border-[#c9a84c] dark:border-[#3b3529] dark:bg-[#242321]"
                />

                <input
                  id="library-admin-file"
                  type="file"
                  accept=".pdf,.epub,application/pdf,application/epub+zip"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  className="mt-3 w-full rounded-xl border border-[#cfc2a7] bg-[#fdfbf7] px-4 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#c9a84c] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#171614] dark:border-[#3b3529] dark:bg-[#242321]"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 rounded-xl bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#171614] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Add book'}
                </button>
              </form>

              <div className="rounded-2xl border border-[#d8c9ab] bg-white/90 p-5 shadow-sm dark:border-[#3b3529] dark:bg-[#1e1d1b]">
                <h2 className="text-lg font-bold">Recent books</h2>

                {isLoadingBooks ? (
                  <p className="mt-4 text-sm text-[#766950] dark:text-[#b8ab92]">Loading...</p>
                ) : books.length === 0 ? (
                  <p className="mt-4 text-sm text-[#766950] dark:text-[#b8ab92]">No books yet.</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {books.map((book) => (
                      <li
                        key={book.id}
                        className="rounded-xl border border-[#d8c9ab] p-3 dark:border-[#3b3529]"
                      >
                        <p className="font-semibold">{book.title}</p>
                        <p className="text-xs text-[#766950] dark:text-[#b8ab92]">
                          {book.author} · {book.category} · {book.fileName || 'No file'} · {formatFileSize(book.fileSize)}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleDelete(book)}
                          disabled={isSubmitting}
                          className="mt-2 rounded-lg border border-red-500 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-70 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {statusMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-400/60 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {statusMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-400/60 bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
