import Link from "next/link";

type NoteCardNote = {
  id: string;
  title: string;
  slug: string;
  category: string;
  preview?: string;
  difficulty: string;
  isFavorite: boolean;
  tags: string[];
};

export default function NoteCard({ note }: { note: NoteCardNote }) {
  return (
    <article>
      <Link
        href={`/notes/${note.slug}`}
        className="group flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors duration-150 hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-muted)]"
      >
        {/* Category + favourite */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
            {note.category}
          </span>
          {note.isFavorite && (
            <span className="text-[11px]" aria-label="Favourite">
              ⭐
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="text-sm font-semibold leading-snug text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] md:text-base"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {note.title}
        </h3>

        {/* Preview */}
        {note.preview && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">
            {note.preview}
          </p>
        )}

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </Link>
    </article>
  );
}
