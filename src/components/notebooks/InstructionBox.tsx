'use client';

import { useState } from 'react';

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
    <div className="notebook-instruction-box">
      <button
        type="button"
        onClick={handleDismiss}
        className="notebook-instruction-dismiss"
        aria-label="Dismiss"
      >
        ×
      </button>

      <p className="notebook-instruction-title">
        <span>📝</span>
        {title}
      </p>

      <ul className="notebook-instruction-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
