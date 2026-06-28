'use client';

import { useRef, useState } from 'react';
import {
  Send,
  Loader2,
  BookOpen,
  MessageSquare,
  ExternalLink,
  Paperclip,
  X,
  Sparkles,
  Download,
} from 'lucide-react';
import MathText from './MathText';
import { AI_MODELS, DEFAULT_MODEL_ID } from '@/lib/ai/models';

type Role = 'user' | 'assistant';
type Message = { role: Role; content: string; image?: string };
type Mode = 'solve' | 'draw' | 'papers';

type Paper = {
  title: string;
  authors: string;
  summary: string;
  published: string;
  link: string;
  pdf: string;
};

const SUGGESTIONS = [
  'Solve x^2 - 5x + 6 = 0 and explain each step',
  'Prove that the square root of 2 is irrational',
  'Explain the fundamental theorem of calculus',
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function MathAIChat() {
  const [mode, setMode] = useState<Mode>('solve');
  const [model, setModel] = useState(DEFAULT_MODEL_ID);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [searching, setSearching] = useState(false);
  const [paperError, setPaperError] = useState<string | null>(null);

  const [drawPrompt, setDrawPrompt] = useState('');
  const [drawUrl, setDrawUrl] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);

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
      { role: 'user', content: content || 'Please read and solve the problem in this image.', image: attached },
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

  async function searchPapers(text: string) {
    const q = text.trim();
    if (!q || searching) return;
    setPaperError(null);
    setSearching(true);
    try {
      const res = await fetch(`/api/math-chat/papers?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Search failed');
      setPapers(data.papers || []);
    } catch (err) {
      setPaperError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSearching(false);
    }
  }

  function generateImage(text: string) {
    const p = text.trim();
    if (!p || drawing) return;
    setDrawError(null);
    setDrawing(true);
    const seed = Math.floor(Math.random() * 1_000_000);
    const prompt = 'clean mathematical diagram, white background, high contrast, neatly labeled: ' + p;
    const url =
      'https://image.pollinations.ai/prompt/' +
      encodeURIComponent(prompt) +
      '?width=1024&height=1024&nologo=true&seed=' +
      seed;
    setDrawUrl(url);
  }

  const tabs: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: 'solve', label: 'Solve', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'draw', label: 'Draw', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'papers', label: 'Papers', icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden shadow-sm">
      <div className="flex items-center gap-1 p-2 border-b border-[var(--color-border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              mode === t.id
                ? 'bg-[var(--color-bg-muted)] text-[var(--color-text)] font-medium'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {mode === 'solve' && (
        <div className="flex flex-col h-[62vh]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-5 space-y-5">
            {messages.length === 0 ? (
              <div className="max-w-xl mx-auto text-center mt-10">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-bg-muted)] mb-4">
                  <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-5">
                  Ask a mathematics question, or attach a photo of a problem.
                </p>
                <div className="flex flex-col items-stretch gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
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
                          className="mb-2 max-h-48 rounded-lg border border-black/10"
                        />
                      )}
                      <p className="text-sm leading-6 whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1 h-7 w-7 shrink-0 rounded-lg bg-[var(--color-bg-muted)] flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <MathText text={m.content} />
                    </div>
                  </div>
                ),
              )
            )}
            {sending && (
              <div className="flex gap-3">
                <div className="mt-1 h-7 w-7 shrink-0 rounded-lg bg-[var(--color-bg-muted)] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] pt-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            {error && <p className="text-center text-xs text-red-400">{error}</p>}
          </div>

          <div className="border-t border-[var(--color-border)] p-3">
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
              className="flex items-end gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 focus-within:border-[var(--color-accent)]"
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
                className="flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-[var(--color-text)] outline-none"
              />
              <button
                type="submit"
                disabled={sending || (!input.trim() && !image)}
                className="shrink-0 inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:opacity-40"
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
              <span className="text-[10px] text-[var(--color-text-tertiary)]">
                Math only · images read by Gemini · 50/day
              </span>
            </div>
          </div>
        </div>
      )}

      {mode === 'draw' && (
        <div className="p-4 md:p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generateImage(drawPrompt);
            }}
            className="flex items-center gap-2 mb-4"
          >
            <input
              value={drawPrompt}
              onChange={(e) => setDrawPrompt(e.target.value)}
              placeholder="Describe a diagram, e.g. 'unit circle with sin and cos labeled'…"
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              disabled={drawing || !drawPrompt.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {drawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate
            </button>
          </form>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
            Generates an illustrative image from your description (free, powered by Pollinations). Great for
            sketches and visual ideas — for exact graphs, use the Solve tab.
          </p>

          {drawError && <p className="text-xs text-red-400 mb-3">{drawError}</p>}

          {drawUrl ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
              {drawing && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--color-text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </div>
              )}
              <img
                src={drawUrl}
                alt="generated"
                onLoad={() => setDrawing(false)}
                onError={() => {
                  setDrawing(false);
                  setDrawError('Could not generate the image. Try again.');
                }}
                className={`w-full rounded-lg ${drawing ? 'hidden' : 'block'}`}
              />
              {!drawing && (
                <a
                  href={drawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                >
                  <Download className="h-3 w-3" /> Open full image
                </a>
              )}
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--color-text-secondary)] mt-6">
              Describe something to generate an image.
            </p>
          )}
        </div>
      )}

      {mode === 'papers' && (
        <div className="p-4 md:p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchPapers(query);
            }}
            className="flex items-center gap-2 mb-4"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search math papers, e.g. 'topology of tori'…"
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
            Results come from arXiv.org — free, open-access international research papers.
          </p>

          {paperError && <p className="text-xs text-red-400 mb-3">{paperError}</p>}

          <div className="space-y-3 max-h-[52vh] overflow-y-auto">
            {papers.map((p, i) => (
              <article
                key={i}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
              >
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">{p.title}</h3>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                  {p.authors} · {p.published}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] leading-5 mb-3 line-clamp-4">
                  {p.summary}
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={p.pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                  >
                    Read PDF <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  >
                    Abstract page
                  </a>
                </div>
              </article>
            ))}
            {!searching && papers.length === 0 && !paperError && (
              <p className="text-center text-xs text-[var(--color-text-secondary)] mt-6">
                No results yet. Search to find papers.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
