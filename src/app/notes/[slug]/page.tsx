import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb';
import { Note } from '@/lib/models/note';
import MDXContent from '@/components/MDXContent';
import Link from 'next/link';

interface NotePageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  await connectToDatabase();
  const note = await Note.findOne({ slug: params.slug, published: true }).lean();

  if (!note) {
    return {
      title: 'Note Not Found',
      description: 'The requested note could not be found.',
    };
  }

  return {
    title: `${note.title} - My Notes`,
    description: note.preview || note.content?.substring(0, 160),
    openGraph: {
      title: note.title,
      description: note.preview || note.content?.substring(0, 160),
      type: 'article',
    },
  };
}

export default async function NoteDetailPage({ params }: NotePageProps) {
  await connectToDatabase();
  const note = await Note.findOne({ slug: params.slug, published: true }).lean();

  if (!note) {
    notFound();
  }

  const formattedNote = {
    ...note,
    id: note._id,
    _id: undefined,
  };

  // Get related notes (same category)
  const relatedNotes = await Note.find({
    category: note.category,
    published: true,
    slug: { $ne: note.slug },
  })
    .limit(3)
    .lean();

  const categoryIcons: Record<string, string> = {
    theorem: '📐',
    definition: '📖',
    lemma: '🔑',
    corollary: '✓',
    conjecture: '❓',
    note: '📝',
  };

  const categoryColors: Record<string, string> = {
    theorem: 'from-blue-600 to-blue-700',
    definition: 'from-purple-600 to-purple-700',
    lemma: 'from-green-600 to-green-700',
    corollary: 'from-cyan-600 to-cyan-700',
    conjecture: 'from-amber-600 to-amber-700',
    note: 'from-pink-600 to-pink-700',
  };

  return (
    <div className="bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.10),transparent_34rem)] pb-12 pt-16 md:pb-20 md:pt-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Link
          href="/notes"
          className="group mb-6 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-secondary)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-text)] md:mb-10 md:text-xs"
        >
          <span>←</span> All Notes
        </Link>
        <div className="flex gap-10 xl:gap-14">
          <article className="min-w-0 flex-grow">
            <div className="mx-auto max-w-[52rem] border-none bg-transparent py-2 md:rounded-2xl md:border md:border-[var(--color-border)] md:bg-[var(--color-surface)] md:p-10 md:shadow-[0_24px_80px_rgba(0,0,0,0.22)] lg:p-12">
              <header className="mb-9 border-b border-[var(--color-border)]/70 pb-7 md:mb-12 md:pb-9">
                <div className="mb-5 flex flex-wrap items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)] md:text-xs">
                  <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1 text-[var(--color-accent)] line-clamp-1">
                    {note.category}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)]/50 bg-[var(--color-surface-hover)] px-3 py-1 line-clamp-1">
                    {note.difficulty}
                  </span>
                  {note.isFavorite && (
                    <span className="flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-yellow-500 line-clamp-1">
                      ⭐ Favorite
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-3 font-normal text-[var(--color-text-tertiary)] opacity-80 mt-2 sm:mt-0">
                    <time dateTime={new Date(note.createdAt).toISOString()}>
                      {new Date(note.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                </div>
                <h1
                  className="mb-8 text-2xl font-bold leading-[1.2] text-[var(--color-text)] md:text-4xl lg:text-[40px]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {note.title}
                </h1>
              </header>

              <div className="prose prose-invert prose-blue max-w-none prose-headings:font-semibold prose-headings:text-[var(--color-text)] prose-p:text-[var(--color-text-secondary)] prose-a:text-[var(--color-accent)] hover:prose-a:underline">
                <MDXContent content={note.content} />
              </div>

              {note.tags && note.tags.length > 0 && (
                <div className="mt-12 border-t border-[var(--color-border)] pt-8">
                  <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)] md:text-xs">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-[11px] text-[var(--color-text-secondary)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {note.references && note.references.length > 0 && (
                <div className="mt-8 pt-4">
                  <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)] md:text-xs">
                    References
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-[12px] md:text-sm text-[var(--color-text-secondary)]">
                    {note.references.map((ref: string, idx: number) => (
                      <li key={idx}>
                        {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relatedNotes.length > 0 && (
                <div className="mt-12 pt-10 border-t border-[var(--color-border)]">
                  <h3 className="text-[10px] font-semibold text-[var(--color-text-tertiary)] md:text-xs mb-6 uppercase tracking-widest">
                    More Notes
                  </h3>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {relatedNotes.map((relatedNote) => (
                      <Link
                        key={relatedNote._id.toString()}
                        href={`/notes/${relatedNote.slug}`}
                        className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-hover)] transition-all"
                      >
                        <h4 className="font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-2" style={{ fontFamily: 'var(--font-serif)' }}>
                          {relatedNote.title}
                        </h4>
                        <p className="mt-2 text-[12px] text-[var(--color-text-secondary)] line-clamp-2">{relatedNote.preview}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
