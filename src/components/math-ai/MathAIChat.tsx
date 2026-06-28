'use client';

import { useRef, useState } from 'react';
import { Send, Loader2, Paperclip, X, Sparkles, Brain, ExternalLink } from 'lucide-react';
import MathText from './MathText';
import { AI_MODELS, DEFAULT_MODEL_ID } from '@/lib/ai/models';

type Role = 'user' | 'assistant';
type Source = { title: string; url: string; kind: string };
type Message = { role: Role; content: string; image?: string; sources?: Source[] };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const SOURCE_LABELS: Record<string, string> = {
  arxiv: 'arXiv',
  stackexchange: 'Math.SE',
  semanticscholar: 'Semantic Scholar',
  openalex: 'OpenAlex',
  web: 'Web',
};

export default function MathAIChat() {
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [deep, setDeep] = useState(false);
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
          deep,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.reply, sources: data.sources || [] },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)] min-h-[460px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-8">
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto text-center mt-20 px-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-bg-muted)] mb-5">
              <Sparkles className="h-6 w-6 text-[var(--color-accent)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
              Ask a mathematics question
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Type a problem below, or attach a photo of one.
            </p>
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
              <div key={i} className="flex gap-2 md:gap-3">
                <div className="mt-1 h-8 w-8 shrink-0 rounded-lg bg-[var(--color-bg-muted)] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-[15px]">
                  <MathText text={m.content} />
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.sources.map((s, j) => (
                        <a
                          key={j}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                        >
                          <span className="font-medium text-[var(--color-accent)]">
                            {SOURCE_LABELS[s.kind] || 'Source'}
                          </span>
                          <span className="max-w-[180px] truncate">{s.title}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          )
        )}
        {sending && (
          <div className="flex gap-2 md:gap-3">
            <div className="mt-1 h-8 w-8 shrink-0 rounded-lg bg-[var(--color-bg-muted)] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] pt-1.5">
              <Loader2 className="h-4 w-4 animate-spin" />{' '}
              {deep ? 'Researching & verifying…' : 'Thinking…'}
            </div>
          </div>
        )}
        {error && <p className="text-center text-xs text-red-400">{error}</p>}
      </div>

      <div className="pt-2 pb-3">
        {image && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
            <Paperclip className="h-3 w-3" />
            <span className="max-w-[150px] truncate">{image.name}</span>
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
          className="flex items-end gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-1.5 shadow-sm focus-within:border-[var(--color-accent)]"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach an image"
            className="shrink-0 rounded-lg p-2.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
          >
            <Paperclip className="h-5 w-5" />
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
            placeholder="Ask a math question…"
            className="flex-1 min-w-0 resize-none bg-transparent px-1 py-2.5 text-base text-[var(--color-text)] outline-none"
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !image)}
            className="shrink-0 inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] h-10 w-10 text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
        <div className="mt-2 flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            onClick={() => setDeep((v) => !v)}
            title="Deep mode: research the web, Wolfram, Math StackExchange, arXiv, Semantic Scholar and OpenAlex, then double-check the answer"
            className={
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ' +
              (deep
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-bg-muted)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]')
            }
          >
            <Brain className="h-3.5 w-3.5" /> Deep mode
          </button>
          {deep && (
            <span className="text-[11px] text-[var(--color-text-tertiary)]">
              Searches the web & papers, then verifies — slower but more accurate
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
