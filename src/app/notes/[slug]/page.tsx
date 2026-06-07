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
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black/50 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <Link href="/notes" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
            <span>←</span> Back to Notes
          </Link>

          <div className="space-y-4">
            {/* Category Badge */}
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-r ${categoryColors[note.category]} rounded-lg p-2 text-white`}>
                <span className="text-lg">{categoryIcons[note.category]}</span>
              </div>
              <span className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                {note.category}
              </span>
              {note.isFavorite && <span className="text-yellow-300">⭐ Favorite</span>}
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">{note.title}</h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <time dateTime={new Date(note.createdAt).toISOString()}>
                  {new Date(note.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>
              <div className="flex items-center gap-2">
                <span>📊</span>
                <span className="capitalize">{note.difficulty}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Main Content */}
        <div className="prose prose-invert max-w-none mb-12">
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8">
            <MDXContent content={note.content} />
          </div>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="mb-12">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800/50 px-3 py-1 text-sm text-gray-300 hover:border-blue-500 hover:text-blue-300 transition-all"
                >
                  #<span>{tag}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* References */}
        {note.references && note.references.length > 0 && (
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-white mb-4">References</h3>
            <ul className="space-y-2">
              {note.references.map((ref: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-gray-500 mt-1">•</span>
                  <span className="text-gray-300">{ref}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Related Notes */}
        {relatedNotes.length > 0 && (
          <div className="mt-16 pt-12 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">
              More {note.category === 'theorem' ? 'Theorems' : note.category === 'definition' ? 'Definitions' : note.category + 's'}
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {relatedNotes.map((relatedNote) => (
                <Link
                  key={relatedNote._id.toString()}
                  href={`/notes/${relatedNote.slug}`}
                  className="group rounded-lg border border-gray-700 bg-gray-800/50 p-6 hover:border-blue-500 hover:bg-gray-700/50 transition-all"
                >
                  <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                    {relatedNote.title}
                  </h4>
                  <p className="mt-2 text-sm text-gray-400 line-clamp-2">{relatedNote.preview}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
