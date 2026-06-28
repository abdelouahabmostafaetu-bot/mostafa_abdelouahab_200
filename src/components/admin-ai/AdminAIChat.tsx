'use client';

import { useRef, useState } from 'react';
import { Send, Loader2, Wand2, CheckCircle2 } from 'lucide-react';
import MathText from '@/components/math-ai/MathText';

type Role = 'user' | 'assistant';
type Message = { role: Role; content: string; actions?: string[] };

const SUGGESTIONS = [
  'List all my blog posts',
  'Write and publish a short post introducing my research interests',
  'Create a draft titled "Intro to Dynamical Systems" with an outline',
];

export default function AdminAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const payload = next.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/admin-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.reply, actions: data.actions || [] },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <Wand2 className="h-4 w-4 text-[var(--color-accent)]" />
        <span className="text-sm font-medium text-[var(--color-text)]">Website Admin Assistant</span>
      </div>

      <div className="flex flex-col h-[62vh]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center mt-8">
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Tell me what to do on your site. For example:
              </p>
              <div className="flex flex-col items-stretch gap-2 max-w-lg mx-auto">
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
                  className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                      : 'bg-[var(--color-bg-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  {m.role === 'user' ? (
                    <p className="text-sm leading-6 whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <>
                      {m.actions && m.actions.length > 0 ? (
                        <div className="mb-2 flex flex-col gap-1">
                          {m.actions.map((a, j) => (
                            <span
                              key={j}
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-400"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> {a}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <MathText text={m.content} />
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          {sending ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-[var(--color-bg-muted)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Working...
              </div>
            </div>
          ) : null}
          {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}
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
            placeholder="e.g. Draft a post about prime numbers and save it as a draft"
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
    </div>
  );
}
