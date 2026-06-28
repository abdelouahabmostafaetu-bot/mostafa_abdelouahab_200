'use client';

import { useRef, useState } from 'react';
import { Send, Loader2, Wand2, CheckCircle2 } from 'lucide-react';
import MathText from '@/components/math-ai/MathText';

type Role = 'user' | 'assistant';
type Message = { role: Role; content: string; actions?: string[] };

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
    <div className="flex flex-col h-[calc(100dvh-9rem)] min-h-[460px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-8">
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto text-center mt-20 px-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-bg-muted)] mb-5">
              <Wand2 className="h-6 w-6 text-[var(--color-accent)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
              Manage your website
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Tell me what to do — draft, edit, publish, or delete blog posts.
            </p>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--color-accent)] text-[var(--color-bg)] px-4 py-2.5">
                  <p className="text-sm leading-6 whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2 md:gap-3">
                <div className="mt-1 h-8 w-8 shrink-0 rounded-lg bg-[var(--color-bg-muted)] flex items-center justify-center">
                  <Wand2 className="h-4 w-4 text-[var(--color-accent)]" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-[15px]">
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
                </div>
              </div>
            ),
          )
        )}
        {sending ? (
          <div className="flex gap-2 md:gap-3">
            <div className="mt-1 h-8 w-8 shrink-0 rounded-lg bg-[var(--color-bg-muted)] flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-[var(--color-accent)]" />
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] pt-1.5">
              <Loader2 className="h-4 w-4 animate-spin" /> Working…
            </div>
          </div>
        ) : null}
        {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}
      </div>

      <div className="pt-2 pb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-end gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-1.5 shadow-sm focus-within:border-[var(--color-accent)]"
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
            className="flex-1 min-w-0 resize-none bg-transparent px-2 py-2.5 text-base text-[var(--color-text)] outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] h-10 w-10 text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
