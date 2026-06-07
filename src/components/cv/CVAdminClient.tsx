'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import type { CVDataDocument, EducationEntry } from '@/lib/models/cv-data';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const inputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] ' +
  'px-3 py-2 text-sm text-[var(--color-text)] ' +
  'placeholder:text-[var(--color-text-tertiary)] ' +
  'outline-none focus:border-[var(--color-accent)] transition-colors duration-150';

export default function CVAdminClient({ initialData }: { initialData: CVDataDocument }) {
  const [interests, setInterests] = useState<string[]>(initialData.researchInterests);
  const [education, setEducation] = useState<EducationEntry[]>(initialData.education);
  const [newInterest, setNewInterest] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  /* ── save ── */
  const handleSave = async () => {
    setSaveState('saving');
    setErrorMsg('');
    try {
      const res = await fetch('/api/cv', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchInterests: interests, education }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Failed to save.');
      }
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err) {
      setSaveState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error saving.');
    }
  };

  /* ── research interests ── */
  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (!trimmed || interests.includes(trimmed)) return;
    setInterests([...interests, trimmed]);
    setNewInterest('');
  };

  const removeInterest = (index: number) =>
    setInterests(interests.filter((_, i) => i !== index));

  /* ── education ── */
  const addEducation = () =>
    setEducation([
      ...education,
      { degree: '', institution: '', location: '', period: '' },
    ]);

  const removeEducation = (index: number) =>
    setEducation(education.filter((_, i) => i !== index));

  const updateEducation = (
    index: number,
    field: keyof EducationEntry,
    value: string,
  ) => {
    setEducation(
      education.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  };

  return (
    <div className="space-y-10">

      {/* ── Research Interests ── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Research Interests
        </h2>

        <div className="mb-3 flex flex-wrap gap-2">
          {interests.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-sm text-[var(--color-text-secondary)]"
            >
              {item}
              <button
                type="button"
                onClick={() => removeInterest(i)}
                className="text-[var(--color-text-tertiary)] hover:text-red-400 transition-colors"
                aria-label={`Remove ${item}`}
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
          {interests.length === 0 && (
            <p className="text-xs text-[var(--color-text-tertiary)]">No interests yet.</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addInterest()}
            placeholder="e.g. Complex Analysis"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addInterest}
            disabled={!newInterest.trim()}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </section>

      {/* ── Education ── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Education
        </h2>

        <div className="space-y-4">
          {education.map((edu, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-[var(--color-text-tertiary)]">
                  Entry {i + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeEducation(i)}
                  className="text-[var(--color-text-tertiary)] hover:text-red-400 transition-colors"
                  aria-label="Remove entry"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid gap-2">
                <input
                  type="text"
                  placeholder="Degree (e.g. Master's in Mathematics)"
                  value={edu.degree}
                  onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Institution"
                  value={edu.institution}
                  onChange={(e) => updateEducation(i, 'institution', e.target.value)}
                  className={inputClass}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Location"
                    value={edu.location}
                    onChange={(e) => updateEducation(i, 'location', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Period (e.g. 2023 — Present)"
                    value={edu.period}
                    onChange={(e) => updateEducation(i, 'period', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addEducation}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Plus size={14} />
          Add degree
        </button>
      </section>

      {/* ── Save button ── */}
      <div>
        {saveState === 'error' && errorMsg && (
          <p className="mb-3 text-sm text-red-400">{errorMsg}</p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saveState === 'saving' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving…
            </>
          ) : saveState === 'saved' ? (
            <>
              <CheckCircle2 size={14} />
              Saved
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}
