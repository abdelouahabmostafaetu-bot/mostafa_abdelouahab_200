'use client';

import { useRef, useState } from 'react';
import { Send, Loader2, BookOpen, MessageSquare, ExternalLink } from 'lucide-react';
import MathText from './MathText';
import { AI_MODELS, DEFAULT_MODEL_ID } from '@/lib/ai/models';

type Role = 'user' | 'assistant';
type Message = { role: Role; content: string };

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

export default function MathAIChat() {
  const [tab, setTab] = useState<'chat' | 'papers'>('chat');
  const [model, setModel] = useState(DEFAULT_MODEL_ID);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [searching, setSearching] = useState(false);
  const [paperError, setPaperError] = useState<string | null>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setError(null);
    const next: Message[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    scrollToBottom();
    try {
      const res = await fetch('/api/math-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, model }),
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

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
      <div className="flex border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setTab('chat')}
          className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
            tab === 'chat'
              ? 'text-[var(--color-text)] border-b-2 border-[var(--color-accent)] font-medium'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          <MessageSquare className="h-4 w-4" /> Solve &amp; Explain
        </button>
        <button
          type="button"
          onClick={() => setTab('papers')}
          className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
            tab === 'papers'
              ? 'text-[var(--color-text)] border-b-2 border-[var(--color-accent)] font-medium'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          <BookOpen className="h-4 w-4" /> Research Papers
        </button>
      </div>

      {tab === 'chat' ? (
        <div className="flex flex-col h-[60vh]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <span className="text-xs text-[var(--color-text-tertiary)]">AI model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center mt-8">
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  Ask a mathematics question. Try one of these:
                </p>
                <div className="flex flex-col items-stretch gap-2 max-w-md mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-left text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      m.role === 'user'
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                        : 'bg-[var(--color-bg-muted)] border border-[var(--color-border)]'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <p className="text-sm leading-6 whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <MathText text={m.content} />
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-[var(--color-bg-muted)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            {error && <p className="text-center text-xs text-red-400">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="border-t border-[var(--color-border)] p-3 flex items-end gap-2"
          >
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
              className="flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      ) : (
        <div className="p-4">
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

          <div className="space-y-3 max-h-[55vh] overflow-y-auto">
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
