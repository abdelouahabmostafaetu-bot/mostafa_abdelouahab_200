import Link from 'next/link';
import Image from 'next/image';
import SiteIcon from '@/components/ui/SiteIcon';
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
  isLast = false,
}: PostCardProps) {
  return (
    <article className={!isLast ? 'mb-2 border-b border-[var(--color-border)] pb-6 md:mb-4 md:pb-8' : ''}>
      <Link
        href={`/blog/${slug}`}
        prefetch
        className="group block cursor-pointer py-1 transition-colors duration-150 hover:text-[var(--color-accent)]"
      >
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={title}
            width={960}
            height={540}
            sizes="(min-width: 768px) 768px, calc(100vw - 32px)"
            className="mb-4 aspect-[16/9] w-full rounded object-cover"
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

        {titleHtml ? (
          <h3
            className="blog-card-title mt-3 text-xl md:text-3xl font-normal leading-snug text-[var(--color-text)] transition-colors duration-150 group-hover:text-[var(--color-accent)]"
            style={{ fontFamily: 'var(--font-serif)' }}
            dangerouslySetInnerHTML={{ __html: titleHtml }}
          />
        ) : (
          <h3
            className="blog-card-title mt-3 text-xl md:text-3xl font-normal leading-snug text-[var(--color-text)] transition-colors duration-150 group-hover:text-[var(--color-accent)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {title}
          </h3>
        )}

        <p className="mt-3 line-clamp-2 text-[14px] leading-7 text-[var(--color-text-secondary)] md:line-clamp-3 md:text-base md:leading-8">
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
