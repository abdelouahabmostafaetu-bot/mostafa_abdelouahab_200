import type { Metadata } from "next";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import { Note } from "@/lib/models/note";
import NoteCard from "@/components/notes/NoteCard";
import { getCurrentAdminUser } from "@/lib/admin";
import SiteIcon from "@/components/ui/SiteIcon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Notes",
  description:
    "A collection of theorems, definitions, lemmas, and mathematical notes.",
};

const CATEGORIES = [
  "theorem",
  "definition",
  "lemma",
  "corollary",
  "conjecture",
  "note",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  theorem: "Theorems",
  definition: "Definitions",
  lemma: "Lemmas",
  corollary: "Corollaries",
  conjecture: "Conjectures",
  note: "Notes",
};

type FormattedNote = {
  id: string;
  title: string;
  slug: string;
  category: string;
  preview?: string;
  difficulty: string;
  isFavorite: boolean;
  tags: string[];
};

export default async function NotesPage() {
  const adminUser = await getCurrentAdminUser();

  let notes: FormattedNote[] = [];
  let fetchError = false;

  try {
    await connectToDatabase();

    const raw = await Note.find({ published: true })
      .sort({ isFavorite: -1, createdAt: -1 })
      .lean();

    notes = raw.map((n) => ({
      id: String(n._id),
      title: String(n.title ?? ""),
      slug: String(n.slug ?? ""),
      category: String(n.category ?? "note"),
      preview: n.preview ? String(n.preview) : undefined,
      difficulty: String(n.difficulty ?? "intermediate"),
      isFavorite: Boolean(n.isFavorite),
      tags: Array.isArray(n.tags) ? (n.tags as string[]) : [],
    }));
  } catch (err) {
    console.error("Notes: DB error:", err);
    fetchError = true;
  }

  const favorites = notes.filter((n) => n.isFavorite);

  const grouped = CATEGORIES.reduce<Record<string, FormattedNote[]>>(
    (acc, cat) => {
      acc[cat] = notes.filter((n) => n.category === cat);
      return acc;
    },
    {},
  );

  return (
    <div className="pt-20 pb-20">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        {/* ── Header ── */}
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-6">
          <div>
            <h1
              className="text-2xl font-semibold text-[var(--color-text)] md:text-4xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              My Notes
            </h1>
            {!fetchError && (
              <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">
                {notes.length} note{notes.length !== 1 ? "s" : ""}
                {favorites.length > 0
                  ? ` · ${favorites.length} favourite${favorites.length !== 1 ? "s" : ""}`
                  : ""}
              </p>
            )}
          </div>

          {adminUser && (
            <Link
              href="/admin/notes"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <SiteIcon name="settings" alt="" className="h-3.5 w-3.5" />
              Manage
            </Link>
          )}
        </div>

        {/* ── Error state ── */}
        {fetchError && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
            Could not load notes — database unavailable.
          </div>
        )}

        {/* ── Empty state ── */}
        {!fetchError && notes.length === 0 && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-16 text-center text-sm text-[var(--color-text-secondary)]">
            No notes yet.
          </div>
        )}

        {/* ── Content ── */}
        {notes.length > 0 && (
          <div className="space-y-12">
            {/* Favourites */}
            {favorites.length > 0 && (
              <section>
                <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
                  <span aria-hidden="true">⭐</span> Favourites
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {favorites.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              </section>
            )}

            {/* By category */}
            {CATEGORIES.map((cat) => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              return (
                <section key={cat}>
                  <h2 className="mb-5 flex items-center justify-between border-b border-[var(--color-border)] pb-2 text-base font-semibold text-[var(--color-text)]">
                    <span>{CATEGORY_LABELS[cat]}</span>
                    <span className="text-xs font-normal text-[var(--color-text-tertiary)]">
                      {items.length}
                    </span>
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {items.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
