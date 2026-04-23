'use client';

import Link from 'next/link';

interface TagProps {
  tag: string;
  count?: number;
  active?: boolean;
  size?: 'sm' | 'md';
  clickable?: boolean;
}

export default function Tag({
  tag,
  count,
  active = false,
  size = 'sm',
  clickable = true,
}: TagProps) {
  const baseClasses = `
    inline-flex items-center gap-1.5 rounded-md border transition-colors duration-150
    ${size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}
    ${
      active
        ? 'bg-[var(--tag-bg-active)] border-[var(--tag-border-active)] text-[var(--color-accent)] dark:text-[var(--tag-text-active)]'
        : 'bg-[var(--tag-bg)] border-[var(--tag-border)] text-[var(--tag-text)] hover:bg-[var(--tag-bg-hover)] hover:border-[var(--tag-border-hover)] hover:text-[var(--tag-text-hover)]'
    }
  `.trim();

  const content = (
    <>
      <span>{tag}</span>
      {count !== undefined && (
        <span
          className={`
            font-medium opacity-70
            ${size === 'sm' ? 'text-[10px]' : 'text-[11px]'}
          `}
        >
          x{count}
        </span>
      )}
    </>
  );

  if (clickable) {
    return (
      <Link href={`/blog?tag=${encodeURIComponent(tag)}`} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return <span className={baseClasses}>{content}</span>;
}

interface TagListProps {
  tags: string[];
  activeTag?: string;
  size?: 'sm' | 'md';
  clickable?: boolean;
}

export function TagList({ tags, activeTag, size = 'sm', clickable = true }: TagListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Tag
          key={tag}
          tag={tag}
          active={tag === activeTag}
          size={size}
          clickable={clickable}
        />
      ))}
    </div>
  );
}
