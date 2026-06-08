"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

type Props =
  | { notebookSlug: string; pageNumber: number; deleteNotebook?: never }
  | { notebookSlug: string; deleteNotebook: true; pageNumber?: never };

export default function NotebookAdminActions(props: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isDeleteNotebook = props.deleteNotebook === true;

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const url = isDeleteNotebook
        ? `/api/notebooks/${props.notebookSlug}`
        : `/api/notebooks/${props.notebookSlug}/pages/${props.pageNumber}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success)
        throw new Error(data.error ?? "Delete failed.");

      if (isDeleteNotebook) {
        router.push("/notes/admin");
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setLoading(false);
    }
  };

  if (isDeleteNotebook) {
    return (
      <div>
        <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
          Permanently delete this notebook and all its pages. This cannot be
          undone.
        </p>
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        {!confirm ? (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 size={13} />
            Delete Notebook
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              {loading ? "Deleting…" : "Confirm Delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              disabled={loading}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  // Delete a page
  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="text-xs text-red-400">{error}</span>}
      {!confirm ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:border-red-500/50 hover:text-red-400"
        >
          Delete
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md bg-red-600/90 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : null}
            {loading ? "Deleting…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            disabled={loading}
            className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)]"
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
