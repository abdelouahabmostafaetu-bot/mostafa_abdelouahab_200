'use client';

import { useRef, useState } from 'react';
import { Send, Loader2, Paperclip, X, Sparkles } from 'lucide-react';
import MathText from './MathText';
import { AI_MODELS, DEFAULT_MODEL_ID } from '@/lib/ai/models';

type Role = 'user' | 'assistant';
type Message = { role: Role; content: string; image?: string };

const SUGGESTIONS = [
  'Solve x^2 - 5x + 6 = 0 and explain each step',
  'Prove that the square root of 2 is irrational',
  'Explain the fundamental theorem of calculus',
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function MathAIChat() {
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large (max 5 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage({ dataUrl: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function sendMessage(text: string) {
    const content = text.trim();
    if ((!content && !image) || sending) return;
    setError(null);
    const attached = image?.dataUrl;
    const next: Message[] = [
      ...messages,
      {
        role: 'user',
        content: content || 'Please read and solve the problem in this image.',
        image: attached,
      },
    ];
    setMessages(next);
    setInput('');
    setImage(null);
    setSending(true);
    scrollToBottom();
    try {
      const res = await fetch('/api/math-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          model,
          image: attached,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] min-h-[480px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-8">
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto text-center mt-16">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-bg-muted)] mb-5">
              <Sparkles className="h-6 w-6 text-[var(--color-accent)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
              Ask a mathematics question
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-7">
              Type a problem below, or attach a photo of one.
            </p>
            <div className="flex flex-col items-stretch gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--color-accent)] text-[var(--color-bg)] px-4 py-2.5">
                  {m.image && (
                    <img
                      src={m.image}
                      alt="attachment"
                      className="mb-2 max-h-56 rounded-lg border border-black/10"
                    />
                  )}
                  <p className="text-sm leading-6 whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <div className="mt-1 h-8 w-8 shrink-0 rounded-lg bg-[var(--color-bg-muted)] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-[15px]">
                  <MathText text={m.content} />
                </div>
              </div>
            ),
          )
        )}
        {sending && (
          <div className="flex gap-3">
            <div className="mt-1 h-8 w-8 shrink-0 rounded-lg bg-[var(--color-bg-muted)] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] pt-1.5">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </div>
          </div>
        )}
        {error && <p className="text-center text-xs text-red-400">{error}</p>}
      </div>

      <div className="pt-2 pb-2">
        {image && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
            <Paperclip className="h-3 w-3" />
            <span className="max-w-[160px] truncate">{image.name}</span>
            <button type="button" onClick={() => setImage(null)} className="hover:text-[var(--color-text)]">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-end gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 shadow-sm focus-within:border-[var(--color-accent)]"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach an image"
            className="shrink-0 rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickImage}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            placeholder="Ask a math question… (use $...$ for LaTeX)"
            className="flex-1 resize-none bg-transparent px-1 py-2 text-[15px] text-[var(--color-text)] outline-none"
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !image)}
            className="shrink-0 inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-sm font-semibold text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-accent)]"
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-[var(--color-text-tertiary)]">Math only · 50/day</span>
        </div>
      </div>
    </div>
  );
}
