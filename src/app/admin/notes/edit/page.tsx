"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import AdminMarkdownEditor from "@/components/admin/AdminMarkdownEditor";

type Category =
  | "theorem"
  | "definition"
  | "lemma"
  | "corollary"
  | "conjecture"
  | "note";
type Difficulty = "beginner" | "intermediate" | "advanced" | "research";
type SaveState = "idle" | "saving" | "done" | "error";

type NoteItem = {
  id: string;
  slug: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  tags: string[];
  preview: string;
  content: string;
  isFavorite: boolean;
  references: string[];
};

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "theorem", label: "Theorem" },
  { value: "definition", label: "Definition" },
  { value: "lemma", label: "Lemma" },
  { value: "corollary", label: "Corollary" },
  { value: "conjecture", label: "Conjecture" },
  { value: "note", label: "Note" },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "research", label: "Research" },
];

const inputClass =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] " +
  "px-3 py-2.5 text-sm text-[var(--color-text)] " +
  "placeholder:text-[var(--color-text-tertiary)] " +
  "outline-none focus:border-[var(--color-accent)] transition-colors duration-150";

const labelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]";

export default function EditNotePage() {
  const router = useRouter();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [selected, setSelected] = useState<NoteItem | null>(null);

  /* form fields */
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("theorem");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [tags, setTags] = useState("");
  const [preview, setPreview] = useState("");
  const [content, setContent] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [references, setReferences] = useState("");

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  /* load all notes once */
  useEffect(() => {
    fetch("/api/notes?limit=100")
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: NoteItem[] }) => {
        setNotes(d.data ?? []);
      })
      .catch(() => setLoadErr("Could not load notes."))
      .finally(() => setLoading(false));
  }, []);

  const selectNote = (note: NoteItem) => {
    setSelected(note);
    setTitle(note.title);
    setCategory(note.category);
    setDifficulty(note.difficulty);
    setTags((note.tags ?? []).join(", "));
    setPreview(note.preview ?? "");
    setContent(note.content ?? "");
    setIsFavorite(Boolean(note.isFavorite));
    setReferences((note.references ?? []).join("\n"));
    setSaveState("idle");
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }
    if (!content.trim()) {
      setErrorMsg("Content is required.");
      return;
    }

    setSaveState("saving");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/notes/${selected.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          preview: preview.trim() || undefined,
          category,
          difficulty,
          isFavorite,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          references: references
            .split("\n")
            .map((r) => r.trim())
            .filter(Boolean),
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success)
        throw new Error(data.error ?? "Failed to update note.");

      setSaveState("done");
      /* update local list title */
      setNotes((prev) =>
        prev.map((n) =>
          n.slug === selected.slug
            ? { ...n, title: title.trim(), category }
            : n,
        ),
      );
      setTimeout(() => router.push("/admin/notes"), 1200);
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  /* ── LIST VIEW ── */
  if (!selected) {
    return (
      <div className="min-h-screen pt-20 pb-20">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
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
              Edit Note
            </h1>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              Select a note to edit
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-2 py-10 text-sm text-[var(--color-text-secondary)]">
              <Loader2 size={14} className="animate-spin" />
              Loading notes…
            </div>
          )}

          {loadErr && <p className="py-8 text-sm text-red-400">{loadErr}</p>}

          {!loading && notes.length === 0 && !loadErr && (
            <p className="py-10 text-center text-sm text-[var(--color-text-secondary)]">
              No notes yet.
            </p>
          )}

          <div className="space-y-2">
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => selectNote(note)}
                className="group w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:border-[var(--color-accent)]/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                      {note.category}
                      {note.isFavorite ? " ⭐" : ""}
                    </p>
                    <p
                      className="truncate text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {note.title}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
                    Edit →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── EDIT FORM ── */
  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            <ArrowLeft size={13} />
            All Notes
          </button>
          <h1
            className="text-2xl font-semibold text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Edit Note
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
            {selected.title}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className={inputClass}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Preview{" "}
              <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={preview}
              onChange={(e) => setPreview(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>Content *</label>
            <AdminMarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="Edit your note…"
            />
          </div>

          <div>
            <label className={labelClass}>
              References{" "}
              <span className="normal-case font-normal">(one per line)</span>
            </label>
            <textarea
              value={references}
              onChange={(e) => setReferences(e.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">
              Mark as favourite ⭐
            </span>
          </label>

          {saveState === "error" && errorMsg && (
            <p className="rounded-lg border border-red-500/30 bg-red-950/15 px-4 py-2.5 text-sm text-red-300">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saveState === "saving" || saveState === "done"}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saveState === "saving" ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving…
                </>
              ) : saveState === "done" ? (
                <>
                  <CheckCircle2 size={14} /> Saved!
                </>
              ) : (
                "Save Changes"
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
