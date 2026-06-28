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
  Menu,
  Trash2,
  Pencil,
  MessageSquare,
  Download,
} from 'lucide-react';
import MathText from './MathText';
import { AI_MODELS, DEFAULT_MODEL_ID } from '@/lib/ai/models';

type Role = 'user' | 'assistant';
type Source = { title: string; url: string; kind: string };
type Message = { role: Role; content: string; image?: string; sources?: Source[] };
type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CONV_KEY = 'math-ai-conversations-v1';
const ACTIVE_KEY = 'math-ai-active-v1';

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

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function newConversation(): Conversation {
  const now = Date.now();
  return { id: genId(), title: 'New chat', createdAt: now, updatedAt: now, messages: [] };
}

function deriveTitle(messages: Message[], fallback: string): string {
  const first = messages.find((m) => m.role === 'user');
  if (first && first.content.trim()) {
    const t = first.content.trim();
    return t.length > 42 ? t.slice(0, 42) + '…' : t;
  }
  return fallback;
}

function relativeTime(ts: number): string {
  const minutes = Math.floor((Date.now() - ts) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + 'd ago';
  return new Date(ts).toLocaleDateString();
}

function decodeSources(header: string | null): Source[] {
  if (!header) return [];
  try {
    return JSON.parse(decodeURIComponent(atob(header))) as Source[];
  } catch {
    return [];
  }
}

function downloadAnswer(text: string) {
  try {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'math-ai-answer.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch {
    // download unavailable
  }
}

export default function MathAIChat() {
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [deep, setDeep] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const active = conversations.find((c) => c.id === activeId);
  const messages = active ? active.messages : [];

  useEffect(() => {
    try {
      const rawC = localStorage.getItem(CONV_KEY);
      const rawA = localStorage.getItem(ACTIVE_KEY);
      const parsed = rawC ? (JSON.parse(rawC) as Conversation[]) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setConversations(parsed);
        const valid = rawA && parsed.some((c) => c.id === rawA) ? rawA : parsed[0].id;
        setActiveId(valid);
      } else {
        const fresh = newConversation();
        setConversations([fresh]);
        setActiveId(fresh.id);
      }
    } catch {
      const fresh = newConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      const slim = conversations.map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({ role: m.role, content: m.content, sources: m.sources })),
      }));
      localStorage.setItem(CONV_KEY, JSON.stringify(slim));
      localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {
      // ignore quota errors
    }
  }, [conversations, activeId, loaded]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  function resetGrow() {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) el.style.height = 'auto';
    });
  }

  function patchActive(fn: (msgs: Message[]) => Message[]) {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const msgs = fn(c.messages);
        const title = c.title === 'New chat' ? deriveTitle(msgs, c.title) : c.title;
        return { ...c, messages: msgs, title, updatedAt: Date.now() };
      }),
    );
  }

  function appendAssistant(content: string, sources: Source[]) {
    patchActive((msgs) => [...msgs, { role: 'assistant', content, sources }]);
  }

  function updateLastAssistant(content: string) {
    patchActive((msgs) => {
      const copy = msgs.slice();
      for (let k = copy.length - 1; k >= 0; k -= 1) {
        if (copy[k].role === 'assistant') {
          copy[k] = { ...copy[k], content };
          break;
        }
      }
      return copy;
    });
  }

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
    const userMsg: Message = {
      role: 'user',
      content: content || 'Please read and solve the problem in this image.',
      image: attached,
    };
    const history = [...messages, userMsg];
    patchActive((msgs) => [...msgs, userMsg]);
    setInput('');
    setImage(null);
    resetGrow();
    await runRequest(history, attached);
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
    patchActive(() => history);
    void runRequest(history, history[history.length - 1].image);
  }

  function newChat() {
    if (sending) abortRef.current?.abort();
    setHistoryOpen(false);
    setInput('');
    setImage(null);
    setError(null);
    resetGrow();
    if (active && active.messages.length === 0) return;
    const fresh = newConversation();
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
  }

  function switchTo(id: string) {
    if (sending) abortRef.current?.abort();
    setActiveId(id);
    setHistoryOpen(false);
    setError(null);
    setInput('');
    setImage(null);
    resetGrow();
  }

  function deleteConversation(id: string) {
    const filtered = conversations.filter((c) => c.id !== id);
    if (filtered.length === 0) {
      const fresh = newConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
      return;
    }
    setConversations(filtered);
    if (id === activeId) setActiveId(filtered[0].id);
  }

  function startRename(c: Conversation) {
    setEditingId(c.id);
    setEditTitle(c.title);
  }

  function commitRename(id: string) {
    const t = editTitle.trim();
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: t || c.title } : c)));
    setEditingId(null);
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
  const sortedConversations = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] min-h-[460px]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
          title="Chat history"
        >
          <Menu className="h-4 w-4" /> History
        </button>
        <span className="truncate px-2 text-xs font-medium text-[var(--color-text-secondary)]">
          {active ? active.title : 'Math AI'}
        </span>
        <button
          type="button"
          onClick={newChat}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--color-text)]">Your chats</span>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-md p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={newChat}
              className="mb-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)]"
            >
              <Plus className="h-4 w-4" /> New chat
            </button>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {sortedConversations.map((c) => (
                <div
                  key={c.id}
                  className={
                    'group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ' +
                    (c.id === activeId
                      ? 'bg-[var(--color-bg-muted)]'
                      : 'hover:bg-[var(--color-bg-muted)]')
                  }
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                  {editingId === c.id ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => commitRename(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(c.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="min-w-0 flex-1 rounded border border-[var(--color-accent)] bg-[var(--color-bg)] px-1.5 py-0.5 text-sm text-[var(--color-text)] outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchTo(c.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm text-[var(--color-text)]">{c.title}</span>
                      <span className="block text-[11px] text-[var(--color-text-tertiary)]">
                        {relativeTime(c.updatedAt)}
                      </span>
                    </button>
                  )}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => startRename(c)}
                      title="Rename"
                      className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteConversation(c.id)}
                      title="Delete"
                      className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-8">
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto text-center mt-12 px-2">
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
                      <button
                        type="button"
                        onClick={() => downloadAnswer(m.content)}
                        title="Download answer"
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
                      >
                        <Download className="h-3.5 w-3.5" /> Save
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
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            placeholder="Ask a math question…"
            className="flex-1 min-w-0 resize-none bg-transparent px-1 py-2.5 text-base text-[var(--color-text)] outline-none max-h-[200px]"
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
