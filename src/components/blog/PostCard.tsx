import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { TagList } from './Tag';

interface PostCardProps {
  slug: string;
  title: string;
  titleHtml?: string;
  category: string;
  excerpt: string;
  readingTime: string;
  coverImageUrl?: string;
  tags?: string[];
  isLast?: boolean;
}

export default function PostCard({
  slug,
  title,
  titleHtml,
  category,
  excerpt,
  readingTime,
  coverImageUrl,
  tags,
}: PostCardProps) {
  return (
    <article className="card-sheen group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] transition duration-200 ease-out hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--shadow-glow)] active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none motion-reduce:active:scale-100">
      <Link
        href={`/blog/${slug}`}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
      >
        {coverImageUrl ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--bg-subtle)]">
            <Image
              src={coverImageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1120px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
            />
          </div>
        ) : null}

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center rounded-[var(--radius-full)] bg-[var(--accent-soft)] px-2.5 py-1 font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
              {category}
            </span>
            <span className="inline-flex items-center gap-1 text-[var(--text-subtle)]">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {readingTime}
            </span>
          </div>

          {titleHtml ? (
            <h2
              className="mt-4 font-serif text-xl leading-snug text-[var(--text)] transition-colors duration-150 group-hover:text-[var(--accent)]"
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
          ) : (
            <h2 className="mt-4 font-serif text-xl leading-snug text-[var(--text)] transition-colors duration-150 group-hover:text-[var(--accent)]">
              {title}
            </h2>
          )}

          <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-[var(--text-muted)]">
            {excerpt}
          </p>

          {tags && tags.length > 0 && (
            <div className="mt-auto pt-4">
              <TagList tags={tags.slice(0, 3)} clickable={false} />
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
