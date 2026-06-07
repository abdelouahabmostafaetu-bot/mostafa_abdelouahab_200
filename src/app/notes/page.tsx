import { Metadata } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { Note } from '@/lib/models/note';
import NoteCard from '@/components/notes/NoteCard';
import NoteCategories from '@/components/notes/NoteCategories';

export const metadata: Metadata = {
  title: 'My Notes - Theorems & Definitions',
  description: 'A collection of elegant theorems, definitions, and mathematical notes.',
};

export default async function NotesPage() {
  await connectToDatabase();

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
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Hero Section */}
        <div className="border-b border-gray-700 bg-gradient-to-b from-black/50 to-transparent backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                <span className="text-sm text-blue-300">Mathematical Collection</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                My Notes & Theorems
              </h1>

              <p className="max-w-2xl text-lg text-gray-400">
                A carefully curated collection of elegant theorems, definitions, and mathematical insights. Each note is crafted with precision and serves as a reference for mathematical concepts.
              </p>

              <div className="flex gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-lg">📚</span>
                  <span>{formattedNotes.length} notes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-lg">⭐</span>
                  <span>{formattedNotes.filter((n) => n.isFavorite).length} favorites</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-7xl px-6 py-12">
          {formattedNotes.length > 0 ? (
            <div className="space-y-16">
              {/* Favorites Section */}
              {formattedNotes.filter((n) => n.isFavorite).length > 0 && (
                <section>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <span className="text-3xl">⭐</span>
                      Favorite Notes
                    </h2>
                    <p className="mt-2 text-gray-400">My most loved and frequently referenced theorems</p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                      <div className="mb-8">
                        <NoteCategories category={category} count={groupedNotes[category].length} />
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {groupedNotes[category].map((note) => (
                          <NoteCard key={note.id} note={note} />
                        ))}
                      </div>
                    </section>
                  )
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-12 text-center">
              <p className="text-gray-400">No notes available yet</p>
            </div>
          )}
        </div>
      </main>
    );
  } catch (error) {
    console.error('Error fetching notes:', error);
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Failed to load notes</p>
        </div>
      </main>
    );
  }
}
