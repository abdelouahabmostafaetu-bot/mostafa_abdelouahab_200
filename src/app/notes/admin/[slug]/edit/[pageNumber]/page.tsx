'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import AdminMarkdownEditor from '@/components/admin/AdminMarkdownEditor';
import InstructionBox from '@/components/notebooks/InstructionBox';

type SaveState = 'idle' | 'saving' | 'done' | 'error';

const inputClass = 'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-colors duration-150';
const labelClass = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]';

export default function EditNotebookPagePage() {
  const router = useRouter();
  const params = useParams<{ slug: string; pageNumber: string }>();
  const { slug, pageNumber } = params;

  const [title,     setTitle]     = useState('');
  const [content,   setContent]   = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg,  setErrorMsg]  = useState('');

  useEffect(() => {
    fetch(`/api/notebooks/${slug}/pages/${pageNumber}`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: { title?: string; content?: string } }) => {
        if (d.success && d.data) {
          setTitle(d.data.title ?? '');
          setContent(d.data.content ?? '');
          setLoadState('ready');
        } else {
          setLoadState('error');
        }
      })
      .catch(() => setLoadState('error'));
  }, [slug, pageNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) { setErrorMsg('Content is required.'); return; }

    setSaveState('saving');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/notebooks/${slug}/pages/${pageNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to update page.');

      setSaveState('done');
      setTimeout(() => router.push(`/notes/admin/${slug}`), 1000);
    } catch (err) {
      setSaveState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-3xl px-4 md:px-6">

        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <Link href={`/notes/admin/${slug}`} className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors">
            <ArrowLeft size={13} /> Back
          </Link>
          <h1 className="font-serif text-2xl text-[var(--color-text)]">
            Edit Page {pageNumber}
          </h1>
        </div>

        {loadState === 'loading' && (
          <div className="flex items-center gap-2 py-10 text-sm text-[var(--color-text-secondary)]">
            <Loader2 size={14} className="animate-spin" /> Loading page…
          </div>
        )}

        {loadState === 'error' && (
          <p className="py-8 text-sm text-red-400">Could not load page data.</p>
        )}

        <InstructionBox
          title="Editing Your Research Page"
          storageKey="nb-edit-page-instructions"
          items={[
            'Review and refine your mathematical arguments',
            'LaTeX: $\\sum_{n=1}^{\\infty}$ inline, $$\\lim_{x\\to 0}$$ display',
            'Use --- for horizontal rules between sections',
            'Preview your changes before saving',
          ]}
        />

        {loadState === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={labelClass}>Page Title <span className="normal-case font-normal">(optional)</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Continuity and Limits" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Content *</label>
              <AdminMarkdownEditor value={content} onChange={setContent} placeholder="Edit page content…" />
            </div>

            {saveState === 'error' && errorMsg && (
              <p className="rounded-lg border border-red-500/30 bg-red-950/15 px-4 py-2.5 text-sm text-red-300">{errorMsg}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saveState === 'saving' || saveState === 'done'} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90 disabled:opacity-60">
                {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : saveState === 'done' ? <><CheckCircle2 size={14} /> Saved!</> : 'Save Changes'}
              </button>
              <Link href={`/notes/admin/${slug}`} className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">Cancel</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
