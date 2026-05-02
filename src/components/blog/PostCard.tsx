import Link from 'next/link';
import SiteIcon from '@/components/ui/SiteIcon';
import { TagList } from './Tag';

interface PostCardProps {
  slug: string;
  title: string;
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
  category,
  excerpt,
  readingTime,
  coverImageUrl,
  tags,
  isLast = false,
}: PostCardProps) {
  return (
    <article className={!isLast ? 'mb-4' : ''}>
      <Link
        href={`/blog/${slug}`}
        className="group block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-6 transition-colors duration-150 hover:bg-[var(--color-bg-muted)]"
      >
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt={title}
            className="mb-4 aspect-[16/9] w-full rounded-xl border border-[var(--color-border)] object-cover"
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs text-[var(--color-text-tertiary)]">
          <span className="inline-flex items-center gap-1.5 font-medium uppercase tracking-widest">
            <SiteIcon name="document" alt="" className="h-3.5 w-3.5" />
            {category}
          </span>
          <span className="inline-flex items-center gap-1">
            <SiteIcon name="notebook" alt="" className="h-3.5 w-3.5" />
            {readingTime}
          </span>
        </div>

        <h3 className="mt-2 text-base md:text-2xl font-semibold leading-snug text-[var(--color-text)] transition-colors duration-150 group-hover:text-[var(--color-text)]" style={{ fontFamily: 'var(--font-serif)' }}>
          {title}
        </h3>

        <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[var(--color-text-secondary)] md:line-clamp-3 md:text-sm md:leading-7">
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
