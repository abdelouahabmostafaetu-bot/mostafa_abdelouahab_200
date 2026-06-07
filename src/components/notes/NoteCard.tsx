import Link from 'next/link';

interface NoteCardProps {
  note: {
    id: string;
    title: string;
    slug: string;
    category: string;
    preview: string;
    difficulty: string;
    isFavorite: boolean;
    tags: string[];
  };
}

export default function NoteCard({ note }: NoteCardProps) {
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

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-900/30 text-green-200',
    intermediate: 'bg-blue-900/30 text-blue-200',
    advanced: 'bg-orange-900/30 text-orange-200',
    research: 'bg-red-900/30 text-red-200',
  };

  return (
    <Link href={`/notes/${note.slug}`}>
      <div className="group relative h-full overflow-hidden rounded-lg border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-6 transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10">
        {/* Gradient overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${categoryColors[note.category]} opacity-0 transition-opacity duration-300 group-hover:opacity-10`} />

        {/* Content */}
        <div className="relative z-10 space-y-4 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className={`bg-gradient-to-r ${categoryColors[note.category]} rounded-lg p-2 text-white flex-shrink-0`}>
              <span className="text-lg">{categoryIcons[note.category]}</span>
            </div>
            {note.isFavorite && <span className="text-lg">⭐</span>}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 flex-grow">
            {note.title}
          </h3>

          {/* Preview */}
          <p className="text-sm text-gray-400 line-clamp-3">{note.preview}</p>

          {/* Footer */}
          <div className="space-y-3 pt-2 border-t border-gray-700">
            {/* Difficulty */}
            <div className="flex gap-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${difficultyColors[note.difficulty]}`}>
                {note.difficulty}
              </span>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-700/50 text-gray-300 capitalize">
                {note.category}
              </span>
            </div>

            {/* Tags */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {note.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
                {note.tags.length > 2 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-400">
                    +{note.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="absolute right-6 top-6 text-gray-600 transition-all duration-300 group-hover:right-4 group-hover:text-blue-400 opacity-0 group-hover:opacity-100">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
