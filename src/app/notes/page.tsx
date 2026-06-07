import { Metadata } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { Note } from '@/lib/models/note';
import NoteCard from '@/components/notes/NoteCard';
import NoteCategories from '@/components/notes/NoteCategories';
import Link from 'next/link';
import { getCurrentAdminUser } from '@/lib/admin';
import SiteIcon from '@/components/ui/SiteIcon';

export const metadata: Metadata = {
  title: 'My Notes - Theorems & Definitions',
  description: 'A collection of elegant theorems, definitions, and mathematical notes.',
};

export default async function NotesPage() {
  await connectToDatabase();
  const adminUser = await getCurrentAdminUser();

  try {
    // Fetch all published notes sorted by favorites first, then by date
    const notes = await Note.find({ published: true })
      .sort({ isFavorite: -1, createdAt: -1 })
      .lean();

    const formattedNotes = notes.map((note) => ({
      ...note,
      id: note._id,
      _id: undefined,
    }));

    // Group notes by category
    const categories = ['theorem', 'definition', 'lemma', 'corollary', 'conjecture', 'note'];
    const groupedNotes = categories.reduce(
      (acc, category) => {
        acc[category] = formattedNotes.filter((note) => note.category === category);
        return acc;
      },
      {} as Record<string, any[]>
    );

    return (
      <div className="pt-20 pb-20">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="mb-12">
             <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-[var(--color-accent)] font-medium mb-2">
                  <SiteIcon name="book" alt="" className="mr-2 inline h-4 w-4 align-[-3px]" />
                  Mathematical Collection
                </p>
                <h1
                  className="text-2xl md:text-4xl font-semibold text-[var(--color-text)] mb-3"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  My Notes & Theorems
                </h1>
                <p className="max-w-2xl text-[12px] md:text-sm leading-6 md:leading-7 text-[var(--color-text-secondary)]">
                  A carefully curated collection of elegant theorems, definitions, and mathematical insights. Each note is crafted with precision.
                  <br />
                  {formattedNotes.length} note{formattedNotes.length !== 1 ? 's' : ''} &middot; {formattedNotes.filter((n) => n.isFavorite).length} favorites
                </p>
              </div>

              {adminUser ? (
                <Link
                  href="/admin/notes"
                  className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <SiteIcon name="settings" alt="" className="mr-2 inline h-4 w-4 align-[-3px]" />
                  Manage Notes
                </Link>
              ) : null}
            </div>
          </div>

          {/* Content */}
          <div>
            {formattedNotes.length > 0 ? (
              <div className="space-y-16">
                {/* Favorites Section */}
                {formattedNotes.filter((n) => n.isFavorite).length > 0 && (
                  <section>
                    <div className="mb-6 border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-[var(--color-text)] flex items-center gap-2">
                         <span className="text-xl">⭐</span> Favorite Notes
                      </h2>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      {formattedNotes
                        .filter((n) => n.isFavorite)
                        .map((note) => (
                          <NoteCard key={note.id} note={note} />
                        ))}
                    </div>
                  </section>
                )}

                {/* By Category */}
                {categories.map(
                  (category) =>
                    groupedNotes[category]?.length > 0 && (
                      <section key={category}>
                        <div className="mb-6 border-b border-[var(--color-border)] pb-2">
                          <NoteCategories category={category} count={groupedNotes[category].length} />
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                          {groupedNotes[category].map((note) => (
                            <NoteCard key={note.id} note={note} />
                          ))}
                        </div>
                      </section>
                    )
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center">
                <p className="text-sm text-[var(--color-text-secondary)]">No notes available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching notes:', error);
    return (
      <div className="pt-20 pb-20 max-w-5xl mx-auto px-4 md:px-6 text-center">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">Failed to load notes.</p>
        </div>
      </div>
    );
  }
}
