'use client';

import { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  Tag,
  User,
} from 'lucide-react';

/* ─── EmailJS credentials (set in .env.local) ──────────────────────────────
   NEXT_PUBLIC_EMAILJS_SERVICE_ID   – your EmailJS service ID
   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID  – your EmailJS template ID
   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY   – your EmailJS public key
   ─────────────────────────────────────────────────────────────────────────── */
const EMAILJS_SERVICE_ID  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID  ?? '';
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? '';
const EMAILJS_PUBLIC_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY  ?? '';

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Collaboration / Research',
  'Question about Blog Post',
  'Question about My Notes',
  'Question about a Problem',
  'Book / Resource Recommendation',
  'Other',
] as const;

type FormState = 'idle' | 'submitting' | 'success' | 'error';

/* ─── Reusable labelled input ─────────────────────────────────────────────── */
function LabelledField({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]"
      >
        <Icon size={11} aria-hidden="true" />
        {label}
      </label>
      {children}
    </div>
  );
}

/* ─── Shared input / textarea / select class ──────────────────────────────── */
const fieldClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ' +
  'px-4 py-2.5 text-sm text-[var(--color-text)] ' +
  'placeholder:text-[var(--color-text-tertiary)] ' +
  'outline-none transition-colors duration-150 ' +
  'focus:border-[var(--color-accent)]';

/* ─── Success card ────────────────────────────────────────────────────────── */
function SuccessCard({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-green-500/20 bg-green-950/10 px-8 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-400">
        <CheckCircle2 size={28} aria-hidden="true" />
      </div>
      <h3
        className="mb-2 text-xl font-semibold text-[var(--color-text)]"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        Message Sent Successfully
      </h3>
      <p className="max-w-xs text-sm leading-6 text-[var(--color-text-secondary)]">
        Thank you for reaching out. I will reply as soon as possible — usually within a few days.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-7 rounded-lg border border-[var(--color-border)] px-5 py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        Send another message
      </button>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function ContactFormClient() {
  const formRef   = useRef<HTMLFormElement>(null);
  const [state,    setState]    = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isConfigured =
    Boolean(EMAILJS_SERVICE_ID) &&
    Boolean(EMAILJS_TEMPLATE_ID) &&
    Boolean(EMAILJS_PUBLIC_KEY);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    /* Graceful fallback when EmailJS env-vars are missing */
    if (!isConfigured) {
      setState('error');
      setErrorMsg(
        'The email service is not configured yet. ' +
        'Please write to me directly: mostafaabdelouahab.etu@centre-univ-mila.dz',
      );
      return;
    }

    setState('submitting');
    setErrorMsg('');

    try {
      await emailjs.sendForm(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        formRef.current,
        { publicKey: EMAILJS_PUBLIC_KEY },
      );
      setState('success');
      formRef.current.reset();
    } catch (err) {
      console.error('EmailJS error:', err);
      setState('error');
      setErrorMsg(
        err instanceof Error && err.message
          ? err.message
          : 'Something went wrong. Please try again or contact via email directly.',
      );
    }
  };

  if (state === 'success') {
    return <SuccessCard onReset={() => setState('idle')} />;
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* ── Name + Email (side-by-side on sm+) ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        <LabelledField id="from_name" label="Full Name" icon={User}>
          <input
            id="from_name"
            name="from_name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            className={fieldClass}
          />
        </LabelledField>

        <LabelledField id="reply_to" label="Email Address" icon={Mail}>
          <input
            id="reply_to"
            name="reply_to"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={fieldClass}
          />
        </LabelledField>
      </div>

      {/* ── Subject dropdown ── */}
      <LabelledField id="subject" label="Subject" icon={Tag}>
        <select
          id="subject"
          name="subject"
          required
          defaultValue=""
          className={fieldClass}
        >
          <option value="" disabled>
            Select a subject…
          </option>
          {SUBJECT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </LabelledField>

      {/* ── Message textarea ── */}
      <LabelledField id="message" label="Message" icon={MessageSquare}>
        <textarea
          id="message"
          name="message"
          rows={7}
          required
          minLength={20}
          placeholder="Write your message here…"
          className={`${fieldClass} resize-y leading-relaxed`}
        />
      </LabelledField>

      {/* ── Error banner ── */}
      {state === 'error' && errorMsg ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/15 px-4 py-3 text-sm leading-6 text-red-300">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[#0f0e0d] transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === 'submitting' ? (
          <>
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            <Send size={15} aria-hidden="true" />
            Send Message
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-[var(--color-text-tertiary)]">
        Your message will be sent directly to my inbox. I read every message personally.
      </p>
    </form>
  );
}
