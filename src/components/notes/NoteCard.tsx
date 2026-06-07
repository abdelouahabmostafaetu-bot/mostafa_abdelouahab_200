import Link from 'next/link';
import SiteIcon from '@/components/ui/SiteIcon';

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
  isLast?: boolean;
}

export default function NoteCard({ note, isLast = false }: NoteCardProps) {
  return (
    <article className={!isLast ? 'mb-4' : ''}>
      <Link href={`/notes/${note.slug}`}>
        <div className="group block cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all duration-150 hover:bg-[var(--color-bg-muted)] active:scale-[0.995] active:opacity-90 md:p-6 w-full h-full flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] md:text-xs text-[var(--color-text-tertiary)]">
            <div className="flex gap-2 items-center">
              <span className="inline-flex items-center gap-1.5 font-medium uppercase tracking-widest">
                <SiteIcon name="book" alt="" className="h-3.5 w-3.5" />
                {note.category}
              </span>
              <span className="inline-flex items-center gap-1">
                <SiteIcon name="notebook" alt="" className="h-3.5 w-3.5" />
                {note.difficulty}
              </span>
            </div>
            {note.isFavorite && <span className="text-[12px]">⭐</span>}
          </div>

          <h3
            className="mt-2 text-base md:text-2xl font-semibold leading-snug text-[var(--color-text)] transition-colors duration-150 group-hover:text-[var(--color-text)] flex-grow"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {note.title}
          </h3>

          <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[var(--color-text-secondary)] md:line-clamp-3 md:text-sm md:leading-7">
            {note.preview}
          </p>

          {note.tags && note.tags.length > 0 && (
            <div className="mt-4 flex gap-1 flex-wrap">
              {note.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded border border-[var(--color-border)] bg-transparent px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]"
                >
                  {tag}
                </span>
              ))}
              {note.tags.length > 2 && (
                <span className="rounded border border-[var(--color-border)] bg-transparent px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                  +{note.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
