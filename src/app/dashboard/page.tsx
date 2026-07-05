import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BookOpen,
  Coffee,
  GraduationCap,
  LogOut,
  NotebookPen,
  PenLine,
  ShieldCheck,
} from 'lucide-react';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Note } from '@/lib/models/note';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import BookModel from '@/lib/models/book';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const ADMIN_SECTIONS = [
  {
    href: '/admin/doctorate-exams',
    label: 'Doctorate Exams',
    description: 'Add full exams with problems and solutions',
    icon: GraduationCap,
  },
  {
    href: '/admin/notes',
    label: 'My Notes',
    description: 'Theorems, definitions, and research notes',
    icon: NotebookPen,
  },
  {
    href: '/admin/problems-with-coffee',
    label: 'Problems with Coffee',
    description: 'Weekly problems with hints and solutions',
    icon: Coffee,
  },
  {
    href: '/blog/admin',
    label: 'Blog',
    description: 'Write and publish articles',
    icon: PenLine,
  },
  {
    href: '/library/admin',
    label: 'Library',
    description: 'Upload and manage books',
    icon: BookOpen,
  },
];

const QUICK_LINKS = [
  { href: '/doctorate-exams', label: 'Doctorate Exam Archive' },
  { href: '/notes', label: 'My Notes' },
  { href: '/problems-with-coffee', label: 'Problems with Coffee' },
  { href: '/library', label: 'My Library' },
];

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard');
  }

  const isAdmin = isAdminEmail(user.email);

  let noteCount = 0;
  let examProblemCount = 0;
  let bookCount = 0;
  if (isAdmin) {
    try {
      await connectToDatabase();
      [noteCount, examProblemCount, bookCount] = await Promise.all([
        Note.countDocuments({}),
        DoctorateProblem.countDocuments({}),
        BookModel.countDocuments({}),
      ]);
    } catch {
      /* db not available — show the dashboard anyway */
    }
  }

  return (
    <div className="pb-20 pt-24 md:pt-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header */}
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          {isAdmin ? 'Admin Console' : 'Your Account'}
        </p>
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-text)]">
          Dashboard
        </h1>

        {/* Profile card */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="flex min-w-0 items-center gap-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full border border-[var(--color-border)] object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] font-serif text-xl font-bold text-[var(--color-bg)]">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-lg font-semibold text-[var(--color-text)]">
                  {user.name || user.email}
                </p>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    <ShieldCheck size={11} aria-hidden="true" />
                    Administrator
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-[var(--color-text-secondary)]">
                {user.email}
              </p>
            </div>
          </div>
          <a
            href="/api/auth/signout"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-red-500/40 hover:text-red-300"
          >
            <LogOut size={13} aria-hidden="true" />
            Sign out
          </a>
        </div>

        {/* Admin area */}
        {isAdmin && (
          <>
            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  Exam Problems
                </p>
                <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">
                  {examProblemCount}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  Notes
                </p>
                <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">
                  {noteCount}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  Books
                </p>
                <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">
                  {bookCount}
                </p>
              </div>
            </div>

            {/* Management sections */}
            <h2 className="mb-4 mt-10 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
              Manage Content
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ADMIN_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-accent)]/50"
                  >
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/10">
                      <Icon
                        size={17}
                        className="text-[var(--color-accent)]"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="font-semibold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]">
                      {section.label}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {section.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Quick links for everyone */}
        <h2 className="mb-4 mt-10 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
          Explore
        </h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
