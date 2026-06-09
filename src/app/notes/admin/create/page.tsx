'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import InstructionBox from '@/components/notebooks/InstructionBox';

type SaveState = 'idle' | 'saving' | 'done' | 'error';

const NOTEBOOK_COLORS = [
  { name: 'Teal',   value: '#194a50' },
  { name: 'Navy',   value: '#1e3a5f' },
  { name: 'Forest', value: '#1a4731' },
  { name: 'Plum',   value: '#3b1f6e' },
  { name: 'Rust',   value: '#7a2e0e' },
  { name: 'Wine',   value: '#6b1a3a' },
  { name: 'Slate',  value: '#2c3e50' },
  { name: 'Olive',  value: '#3d4a1a' },
];

const inputClass = 'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-colors duration-150';
const labelClass = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]';

export default function CreateNotebookPage() {
  const router = useRouter();
  const [title,       setTitle]       = useState('');
  const [subject,     setSubject]     = useState('Mathematics');
  const [description, setDescription] = useState('');
  const [color,       setColor]       = useState(NOTEBOOK_COLORS[0].value);
  const [saveState,   setSaveState]   = useState<SaveState>('idle');
  const [errorMsg,    setErrorMsg]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErrorMsg('Title is required.'); return; }

    setSaveState('saving');
    setErrorMsg('');

    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), subject, description, color }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; data?: { slug?: string } };

      if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to create notebook.');

      setSaveState('done');
      setTimeout(() => router.push(`/notes/admin/${data.data?.slug ?? ''}`), 1000);
    } catch (err) {
      setSaveState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-xl px-4 md:px-6">

        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <Link href="/notes/admin" className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors">
            <ArrowLeft size={13} /> Back
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-handwritten)', fontSize: '28px' }}>
            Create Notebook
          </h1>
        </div>

        <InstructionBox
          title="Creating a Research Notebook"
          storageKey="nb-create-instructions"
          items={[
            'Give your notebook a clear title (e.g., "Real Analysis — Year 1")',
            'Choose a subject area to keep your research organized',
            'Add a short description of what this notebook covers',
            'Pick a cover color to distinguish your notebooks',
            'After creating, you can add pages with your theories and theorems',
          ]}
        />

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className={labelClass}>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Real Analysis" className={inputClass} required />
          </div>

          <div>
            <label className={labelClass}>Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Description <span className="normal-case font-normal">(optional)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this notebook…" rows={2} className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className={labelClass}>Cover Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {NOTEBOOK_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.name}
                  className="relative h-8 w-8 rounded-md transition-transform hover:scale-110"
                  style={{ backgroundColor: c.value }}
                >
                  {color === c.value && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--color-text-tertiary)]">
              Selected: {NOTEBOOK_COLORS.find((c) => c.value === color)?.name ?? color}
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
            <div className="p-4">
              <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)]">{subject || 'Subject'}</p>
              <p className="mt-1 text-base font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-serif)' }}>
                {title || 'Notebook Title'}
              </p>
              {description && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{description}</p>}
              <p className="mt-3 text-[10px] text-[var(--color-text-tertiary)]">0 pages</p>
            </div>
          </div>

          {saveState === 'error' && errorMsg && (
            <p className="rounded-lg border border-red-500/30 bg-red-950/15 px-4 py-2.5 text-sm text-red-300">{errorMsg}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saveState === 'saving' || saveState === 'done'} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90 disabled:opacity-60">
              {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : saveState === 'done' ? <><CheckCircle2 size={14} /> Created!</> : 'Create Notebook'}
            </button>
            <Link href="/notes/admin" className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
