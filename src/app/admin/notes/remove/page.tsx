"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

type NoteItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  isFavorite: boolean;
};

export default function RemoveNotePage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [deleting, setDeleting] = useState<string | null>(
    null,
  ); /* slug being deleted */
  const [confirm, setConfirm] = useState<string | null>(
    null,
  ); /* slug pending confirm */
  const [deleteErr, setDeleteErr] = useState("");

  useEffect(() => {
    fetch("/api/notes?limit=100")
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: NoteItem[] }) => {
        setNotes(d.data ?? []);
      })
      .catch(() => setLoadErr("Could not load notes."))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (slug: string) => {
    setDeleting(slug);
    setDeleteErr("");

    try {
      const res = await fetch(`/api/notes/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success)
        throw new Error(data.error ?? "Failed to delete.");

      setNotes((prev) => prev.filter((n) => n.slug !== slug));
      setConfirm(null);
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        {/* Header */}
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <Link
            href="/admin/notes"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            <ArrowLeft size={13} />
            Back
          </Link>
          <h1
            className="text-2xl font-semibold text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Remove Note
          </h1>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Deletion is permanent and cannot be undone.
          </p>
        </div>

        {/* Error from delete */}
        {deleteErr && (
          <p className="mb-5 rounded-lg border border-red-500/30 bg-red-950/15 px-4 py-2.5 text-sm text-red-300">
            {deleteErr}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-10 text-sm text-[var(--color-text-secondary)]">
            <Loader2 size={14} className="animate-spin" />
            Loading notes…
          </div>
        )}

        {/* Load error */}
        {loadErr && !loading && (
          <p className="py-8 text-sm text-red-400">{loadErr}</p>
        )}

        {/* Empty */}
        {!loading && !loadErr && notes.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--color-text-secondary)]">
            No notes yet.
          </p>
        )}

        {/* Notes list */}
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {note.category}
                  {note.isFavorite ? " ⭐" : ""}
                </p>
                <p
                  className="truncate text-sm font-medium text-[var(--color-text)]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {note.title}
                </p>
              </div>

              {/* Actions */}
              {confirm === note.slug ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(note.slug)}
                    disabled={deleting === note.slug}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {deleting === note.slug ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    {deleting === note.slug ? "Deleting…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    disabled={deleting === note.slug}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirm(note.slug);
                    setDeleteErr("");
                  }}
                  className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:border-red-500/50 hover:text-red-400"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
