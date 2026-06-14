import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { connectToDatabase } from "@/lib/mongodb";
import { Note } from "@/lib/models/note";
import MDXContent from "@/components/MDXContent";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    await connectToDatabase();
    const note = await Note.findOne({ slug, published: true }).lean();
    if (!note) return { title: "Note Not Found" };
    return {
      title: `${note.title} | My Notes`,
      description: note.preview || String(note.content ?? "").substring(0, 160),
    };
  } catch {
    return { title: "My Notes" };
  }
}

export default async function NoteDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let note: Awaited<ReturnType<typeof Note.findOne>> | null = null;
  let relatedNotes: Awaited<ReturnType<typeof Note.find>> = [];

  try {
    await connectToDatabase();
    note = await Note.findOne({ slug, published: true }).lean();
    if (note) {
      relatedNotes = await Note.find({
        category: note.category,
        published: true,
        slug: { $ne: note.slug },
      })
        .limit(3)
        .lean();
    }
  } catch (err) {
    console.error("Note detail: DB error:", err);
  }

  if (!note) {
    notFound();
  }

  const CATEGORY_LABELS: Record<string, string> = {
    theorem: "Theorem",
    definition: "Definition",
    lemma: "Lemma",
    corollary: "Corollary",
    conjecture: "Conjecture",
    note: "Note",
  };

  return (
    <div className="pb-20 pt-20 md:pt-28">
      <div className="mx-auto max-w-[680px] px-5 md:px-8">
        {/* Back */}
        <Link
          href="/notes"
          className="mb-10 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft size={12} aria-hidden="true" />
          All Notes
        </Link>

        {/* Article */}
        <article>
          <header className="mb-10">
            {/* Category */}
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">
              {CATEGORY_LABELS[note.category] ?? note.category}
            </p>

            {/* Title */}
            <h1
              className="mb-4 text-[2rem] font-normal leading-[1.15] text-[var(--color-text)] md:text-[2.5rem]"
              style={{ fontFamily: "var(--font-reading)" }}
            >
              {note.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
              {note.difficulty && (
                <span className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-[10px]">
                  {note.difficulty}
                </span>
              )}
              {note.isFavorite && (
                <Star
                  size={12}
                  className="fill-[var(--color-accent)] text-[var(--color-accent)]"
                  aria-label="Favourite"
                />
              )}
              <time
                dateTime={new Date(note.createdAt).toISOString()}
                className="ml-auto"
              >
                {new Date(note.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>
          </header>

          {/* Content */}
          <div className="notes-reading">
            <MDXContent content={note.content} />
          </div>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="mt-12 border-t border-[var(--color-border)] pt-6">
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {note.references && note.references.length > 0 && (
            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-tertiary)]">
                References
              </p>
              <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                {note.references.map((ref: string, i: number) => (
                  <li key={i}>{ref}</li>
                ))}
              </ul>
            </div>
          )}
        </article>

        {/* Related notes */}
        {relatedNotes.length > 0 && (
          <div className="mt-14 border-t border-[var(--color-border)] pt-8">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-tertiary)]">
              More Notes
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedNotes.map((r) => (
                <Link
                  key={String(r._id)}
                  href={`/notes/${r.slug}`}
                  className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-hover)]"
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    {r.category}
                  </p>
                  <h4
                    className="text-sm font-normal text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] line-clamp-2"
                    style={{ fontFamily: "var(--font-reading)" }}
                  >
                    {r.title}
                  </h4>
                  {r.preview && (
                    <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)] line-clamp-2">
                      {r.preview}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back to notes */}
        <div className="mt-14 border-t border-[var(--color-border)] pt-6">
          <Link
            href="/notes"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={14} />
            Back to all notes
          </Link>
        </div>
      </div>
    </div>
  );
}
