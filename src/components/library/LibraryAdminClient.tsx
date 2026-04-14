'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  BookOpen,
  ArrowLeft,
  Lock,
  Download,
  Link2,
  Upload,
} from 'lucide-react';
import { PRESET_CATEGORIES } from '@/lib/library-categories';
import type { LibraryBook } from '@/types/library';

const ADMIN_PASSWORD = 'library2024';

type AdminFormState = {
  title: string;
  author: string;
  category: string;
  description: string;
  coverUrl: string;
  fileUrl: string;
};

const initialFormState: AdminFormState = {
  title: '',
  author: '',
  category: PRESET_CATEGORIES[0],
  description: '',
  coverUrl: '',
  fileUrl: '',
};

function parseBooks(payload: unknown): LibraryBook[] {
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
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

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
      const response = await fetch('/api/books', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load books.');
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
    setStatusMessage('Access granted.');
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
        body: JSON.stringify({ password: passwordInput }),
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
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-[var(--color-accent)]" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Admin Panel
              </p>
            </div>
            <h1
              className="text-3xl font-bold sm:text-4xl text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Library Manager
            </h1>
          </div>

          <Link
            href="/library"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={14} />
            Back to Library
          </Link>
        </div>

        {/* Login gate */}
        {!isAuthorized ? (
          <div className="mt-12 flex justify-center">
            <form
              onSubmit={handleUnlock}
              className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-8"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="rounded-full bg-[var(--color-bg-elevated)] p-4">
                  <Lock size={24} className="text-[var(--color-accent)]" />
                </div>
              </div>
              <h2 className="text-center text-lg font-bold mb-1">Authentication Required</h2>
              <p className="text-center text-xs text-[var(--color-text-secondary)] mb-6">
                Enter your admin password to continue
              </p>

              <input
                id="library-admin-password"
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                className={inputClasses}
                placeholder="Admin password"
                required
              />

              <button
                type="submit"
                className="mt-4 w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-all hover:opacity-90"
              >
                Unlock
              </button>
            </form>
          </div>
        ) : (
          /* Admin content */
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Add book form */}
            <form
              onSubmit={handleCreate}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <Plus size={18} className="text-[var(--color-accent)]" />
                <h2 className="text-lg font-bold">Add New Book</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="library-admin-title"
                      className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"
                    >
                      Title
                    </label>
                    <input
                      id="library-admin-title"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Book title"
                      required
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="library-admin-author"
                      className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"
                    >
                      Author
                    </label>
                    <input
                      id="library-admin-author"
                      value={form.author}
                      onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                      placeholder="Author name"
                      required
                      className={inputClasses}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="library-admin-category"
                    className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"
                  >
                    Category
                  </label>
                  <select
                    id="library-admin-category"
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className={inputClasses}
                  >
                    {PRESET_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="library-admin-description"
                    className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"
                  >
                    Description
                  </label>
                  <textarea
                    id="library-admin-description"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                    rows={3}
                    className={`${inputClasses} resize-none`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="library-admin-cover-url"
                    className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"
                  >
                    Cover Image URL
                  </label>
                  <input
                    id="library-admin-cover-url"
                    type="url"
                    value={form.coverUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, coverUrl: e.target.value }))}
                    placeholder="https://..."
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label
                    htmlFor="library-admin-file"
                    className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"
                  >
                    Book File
                  </label>
                  <p className="mb-2 text-xs text-[var(--color-text-tertiary)]">
                    Upload a PDF or EPUB, or paste a direct download link below.
                  </p>
                  <input
                    id="library-admin-file"
                    type="file"
                    accept=".pdf,.epub,application/pdf,application/epub+zip"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#0f0e0d]"
                  />
                  {selectedFile ? (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                      <Upload size={12} />
                      {selectedFile.name}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="library-admin-file-url"
                    className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"
                  >
                    Direct Download Link
                  </label>
                  <input
                    id="library-admin-file-url"
                    type="url"
                    value={form.fileUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
                    placeholder="https://example.com/book.pdf"
                    className={inputClasses}
                  />
                  <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                    Use this when the file is already hosted online or blob upload is not configured.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Book'}
                </button>
              </div>
            </form>

            {/* Recent books */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-6">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen size={18} className="text-[var(--color-accent)]" />
                <h2 className="text-lg font-bold">Recent Books</h2>
                <span className="ml-auto text-xs text-[var(--color-text-tertiary)]">
                  {books.length} total
                </span>
              </div>

              {isLoadingBooks ? (
                <div className="space-y-3">
                  {['book-skeleton-1', 'book-skeleton-2', 'book-skeleton-3'].map((key) => (
                    <div key={key} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 animate-pulse">
                      <div className="h-4 bg-[var(--color-bg-elevated)] rounded w-2/3 mb-2" />
                      <div className="h-3 bg-[var(--color-bg-elevated)] rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : books.length === 0 ? (
                <div className="text-center py-8 text-sm text-[var(--color-text-secondary)]">
                  No books yet. Add your first book above.
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {books.map((book) => (
                    <div
                      key={book.id}
                      className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-all hover:border-[var(--color-accent)]/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate text-[var(--color-text)]">
                            {book.title}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-text-secondary)] truncate">
                            {book.author} &middot; {book.category}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                            {book.fileName || (book.filePath ? 'Download ready' : 'No file')}
                            {book.filePath
                              ? ` · ${book.fileSize ? formatFileSize(book.fileSize) : 'Size unknown'}`
                              : ''}
                          </p>
                          {book.filePath ? (
                            <a
                              href={`/api/books/${book.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] transition-opacity hover:opacity-80"
                            >
                              <Download size={12} />
                              <span>Open download</span>
                              <Link2 size={12} />
                            </a>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDelete(book)}
                          disabled={isSubmitting}
                          className="shrink-0 rounded-lg border border-red-500/30 p-2 text-red-400 transition-all hover:bg-red-500/10 hover:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Delete book"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status / Error messages */}
        {statusMessage ? (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-5 py-3 text-sm text-emerald-300">
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-950/20 px-5 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
