import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { connectToDatabase } from "@/lib/mongodb";
import { Note } from "@/lib/models/note";
import SiteIcon from "@/components/ui/SiteIcon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notes Admin",
};

export default async function AdminNotesPage() {
  await requireAdmin();

  let total = 0;
  try {
    await connectToDatabase();
    total = await Note.countDocuments({ published: true });
  } catch {
    /* db not available */
  }

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <Link
            href="/notes"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            ← Back to Notes
          </Link>
          <h1
            className="text-2xl font-semibold text-[var(--color-text)] md:text-3xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Manage Notes
          </h1>
          {total > 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {total} published note{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/admin/notes/add"
            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-accent)]/50"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/10">
              <SiteIcon name="add" alt="" className="h-5 w-5" />
            </div>
            <p className="font-semibold text-[var(--color-text)]">Add Note</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Create a new theorem, definition, or note
            </p>
          </Link>

          <Link
            href="/admin/notes/edit"
            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-accent)]/50"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/10">
              <SiteIcon name="edit" alt="" className="h-5 w-5" />
            </div>
            <p className="font-semibold text-[var(--color-text)]">Edit Note</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Modify title, content, tags, or category
            </p>
          </Link>

          <Link
            href="/admin/notes/remove"
            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-red-500/30"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
              <SiteIcon name="delete" alt="" className="h-5 w-5" />
            </div>
            <p className="font-semibold text-[var(--color-text)]">
              Remove Note
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Permanently delete a note
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
