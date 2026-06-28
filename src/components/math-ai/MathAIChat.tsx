'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Send,
  Loader2,
  Paperclip,
  X,
  Sparkles,
  Brain,
  ExternalLink,
  Globe,
  Copy,
  Check,
  RefreshCw,
  Square,
  Plus,
} from 'lucide-react';
import MathText from './MathText';
import { AI_MODELS, DEFAULT_MODEL_ID } from '@/lib/ai/models';

type Role = 'user' | 'assistant';
type Source = { title: string; url: string; kind: string };
type Message = { role: Role; content: string; image?: string; sources?: Source[] };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const STORAGE_KEY = 'math-ai-chat-v1';

const SOURCE_LABELS: Record<string, string> = {
  arxiv: 'arXiv',
  stackexchange: 'Math.SE',
  semanticscholar: 'Semantic Scholar',
  openalex: 'OpenAlex',
  web: 'Web',
};

const STARTERS = [
  'Solve x^2 - 5x + 6 = 0 and explain each step',
  'Find the derivative of f(x) = x sin(x)',
  'Prove that the square root of 2 is irrational',
  'Explain eigenvalues with a simple example',
];

function decodeSources(header: string | null): Source[] {
  if (!header) return [];
  try {
    return JSON.parse(decodeURIComponent(atob(header))) as Source[];
  } catch {
    return [];
  }
}

export default function MathAIChat() {
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [deep, setDeep] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  useEffect(() => {
    try {
      const slim = messages.map((m) => ({ role: m.role, content: m.content, sources: m.sources }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

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

  function appendAssistant(content: string, sources: Source[]) {
    setMessages((m) => [...m, { role: 'assistant', content, sources }]);
  }

  function updateLastAssistant(content: string) {
    setMessages((m) => {
      const copy = m.slice();
      for (let k = copy.length - 1; k >= 0; k -= 1) {
        if (copy[k].role === 'assistant') {
          copy[k] = { ...copy[k], content };
          break;
        }
      }
      return copy;
    });
  }

  async function runRequest(history: Message[], attached?: string) {
    setSending(true);
    setError(null);
    scrollToBottom();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/math-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          model,
          image: attached,
          deep,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let message = 'Request failed';
        try {
          const data = await res.json();
          message = data?.error || message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      // Streaming response (normal text answers).
      if (res.headers.get('x-stream') === '1' && res.body) {
        const sources = decodeSources(res.headers.get('x-sources'));
        appendAssistant('', sources);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          updateLastAssistant(acc);
          scrollToBottom();
        }
        return;
      }

      // Full JSON response (images + Deep mode).
      const data = await res.json();
      appendAssistant(data.reply, data.sources || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // user stopped — keep whatever streamed so far
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setSending(false);
      abortRef.current = null;
      scrollToBottom();
    }
  }

  async function sendMessage(text: string) {
    const content = text.trim();
    if ((!content && !image) || sending) return;
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
    await runRequest(next, attached);
  }

  function stopGenerating() {
    abortRef.current?.abort();
  }

  function regenerate() {
    if (sending) return;
    let end = messages.length;
    while (end > 0 && messages[end - 1].role === 'assistant') end -= 1;
    if (end === 0) return;
    const history = messages.slice(0, end);
    setMessages(history);
    void runRequest(history, history[history.length - 1].image);
  }

  function newChat() {
    if (sending) abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput('');
    setImage(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  async function copyAnswer(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied((c) => (c === index ? null : c)), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  const loadingText = image
    ? 'Reading the image…'
    : deep
      ? 'Researching & verifying…'
      : 'Searching & solving…';

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';
  const showThinking = sending && !lastIsAssistant;

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)] min-h-[460px]">
      {messages.length > 0 && (
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
          <span className="text-xs text-[var(--color-text-tertiary)]">Math AI</span>
          <button
            type="button"
            onClick={newChat}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-8">
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto text-center mt-16 px-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-bg-muted)] mb-5">
              <Sparkles className="h-6 w-6 text-[var(--color-accent)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
              Ask a mathematics question
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Type a problem below, or attach a photo of one.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
              <Globe className="h-3.5 w-3.5" /> Searches Math StackExchange, the web & research papers automatically
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2.5 text-left text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
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
              <div key={i} className="group flex gap-2 md:gap-3">
                <div className="mt-1 h-8 w-8 shrink-0 rounded-lg bg-[var(--color-bg-muted)] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-[15px]">
                  {m.content ? (
                    <MathText text={m.content} />
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                      <Loader2 className="h-4 w-4 animate-spin" /> {loadingText}
                    </span>
                  )}
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
                  {m.content && (
                    <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => copyAnswer(m.content, i)}
                        title="Copy answer"
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
                      >
                        {copied === i ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied === i ? 'Copied' : 'Copy'}
                      </button>
                      {i === messages.length - 1 && !sending && (
                        <button
                          type="button"
                          onClick={regenerate}
                          title="Regenerate this answer"
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ),
          )
        )}
        {showThinking && (
          <div className="flex gap-2 md:gap-3">
            <div className="mt-1 h-8 w-8 shrink-0 rounded-lg bg-[var(--color-bg-muted)] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
            </div>
            <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] pt-1.5">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {loadingText}
              </span>
              <button
                type="button"
                onClick={stopGenerating}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
              >
                <Square className="h-3 w-3" /> Stop
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-center text-xs text-red-400">{error}</p>}
      </div>

      <div className="pt-2 pb-3">
        {!sending && lastIsAssistant && (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              onClick={regenerate}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </button>
          </div>
        )}
        {image && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
            <Paperclip className="h-3 w-3" />
            <span className="max-w-[150px] truncate">{image.name}</span>
            <span className="text-[var(--color-text-tertiary)]">· read by Gemini</span>
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
            title="Attach an image (read by Gemini)"
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
          {sending ? (
            <button
              type="button"
              onClick={stopGenerating}
              title="Stop"
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-[var(--color-bg-muted)] h-10 w-10 text-[var(--color-text)] transition-opacity hover:opacity-90"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && !image}
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] h-10 w-10 text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        </form>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            title="Choose the math model"
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
            title="Deep mode double-checks (verifies) the answer with a second strict pass. The web & papers are always searched either way."
            className={
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ' +
              (deep
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-bg-muted)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]')
            }
          >
            <Brain className="h-3.5 w-3.5" /> Deep mode
          </button>
          <span className="text-[11px] text-[var(--color-text-tertiary)]">
            {deep ? 'Double-checks every answer — slower but most accurate' : 'Streams the answer live as it is written'}
          </span>
        </div>
      </div>
    </div>
  );
}
