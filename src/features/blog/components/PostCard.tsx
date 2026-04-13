import Link from 'next/link';
import { Clock } from 'lucide-react';
import { TagList } from './Tag';

interface PostCardProps {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  readingTime: string;
  tags?: string[];
  isLast?: boolean;
}

export default function PostCard({
  slug,
  title,
  date,
  category,
  excerpt,
  readingTime,
  tags,
  isLast = false,
}: PostCardProps) {
  return (
    <article className={!isLast ? 'mb-4' : ''}>
      <Link
        href={`/blog/${slug}`}
        className="group block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-6 transition-colors duration-150 hover:bg-[var(--color-bg-muted)]"
      >
        <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs text-[var(--color-text-tertiary)]">
          <span className="font-medium uppercase tracking-widest">{category}</span>
        </div>

        <h3 className="mt-2 text-base md:text-2xl font-semibold leading-snug text-[var(--color-text)] transition-colors duration-150 group-hover:text-[var(--color-text)]" style={{ fontFamily: 'var(--font-serif)' }}>
          {title}
        </h3>

        <p className="mt-2 text-[12px] md:text-sm text-[var(--color-text-secondary)] leading-6 md:leading-7 line-clamp-3">
          {excerpt}
        </p>
      </Link>

      {tags && tags.length > 0 && (
        <div className="mt-3 text-[10px]">
          <TagList tags={tags} size="sm" />
        </div>
      )}
    </article>
  );
}
