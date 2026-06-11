'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

type InstructionBoxProps = {
  title: string;
  items: string[];
  storageKey?: string;
};

export default function InstructionBox({
  title,
  items,
  storageKey,
}: InstructionBoxProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined' || !storageKey) return false;
    try {
      return sessionStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (storageKey) {
      try {
        sessionStorage.setItem(storageKey, '1');
      } catch {
        /* noop */
      }
    }
  };

  return (
    <div className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-4 pr-10">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
        aria-label="Dismiss"
      >
        <X size={14} aria-hidden="true" />
      </button>

      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
        <Info
          size={14}
          className="shrink-0 text-[var(--color-accent)]"
          aria-hidden="true"
        />
        {title}
      </p>

      <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
