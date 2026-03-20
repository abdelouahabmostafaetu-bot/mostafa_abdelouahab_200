'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import Tag from './Tag';

interface TagFilterProps {
  tags: { tag: string; count: number }[];
  activeTag: string;
}

export default function TagFilter({ tags, activeTag }: TagFilterProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleTags = expanded ? tags : tags.slice(0, 15);
  const hasMore = tags.length > 15;

  return (
    <div className="mb-10 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-secondary)] font-medium">
          Tags
        </h2>
        {activeTag && (
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:opacity-80 transition-opacity"
          >
            <X size={12} />
            Clear filter
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {visibleTags.map(({ tag, count }) => (
          <Tag
            key={tag}
            tag={tag}
            count={count}
            active={tag === activeTag}
            size="sm"
          />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp size={12} />
              Show fewer tags
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              Show {tags.length - 15} more tags
            </>
          )}
        </button>
      )}
    </div>
  );
}
