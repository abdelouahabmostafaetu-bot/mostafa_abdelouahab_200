'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Send,
  Loader2,
  Wand2,
  CheckCircle2,
  Settings,
  Trash2,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import MathText from '@/components/math-ai/MathText';

type Role = 'user' | 'assistant';
type Message = { role: Role; content: string; actions?: string[] };

type AdminModel = {
  id: string;
  label: string;
  provider: string;
  model: string;
  envKey: string;
  baseUrl: string;
  vision: boolean;
  reasoning: boolean;
  custom: boolean;
  keySet: boolean;
  docId: string;
};

type ModelForm = {
  label: string;
  provider: string;
  model: string;
  envKey: string;
  baseUrl: string;
  vision: boolean;
  reasoning: boolean;
};

const EMPTY_FORM: ModelForm = {
  label: '',
  provider: 'openrouter',
  model: '',
  envKey: '',
  baseUrl: '',
  vision: false,
  reasoning: false,
};

const INPUT_CLS =
  'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]';

export default function AdminAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState('gemini-flash');
  const [models, setModels] = useState<AdminModel[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);
  const [form, setForm] = useState<ModelForm>(EMPTY_FORM);
  const [savingModel, setSavingModel] = useState(false);
  const [modelMsg, setModelMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadModels() {
    try {
      const res = await fetch('/api/admin-models');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.models)) setModels(data.models as AdminModel[]);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadModels();
  }, []);

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
        body: JSON.stringify({ messages: payload, model }),
      });
      const raw = await res.text();
      let data: { reply?: string; actions?: string[]; error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          res.status === 504 || res.status === 408 || res.status === 503
            ? 'The request took too long and timed out on the server. Try a shorter request, or pick a faster model.'
            : 'The server returned an unexpected response (status ' +
              res.status +
              '). Please try again in a moment.',
        );
      }
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.reply ?? '', actions: data.actions || [] },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  async function addModel() {
    if (savingModel) return;
    setModelMsg(null);
    if (!form.label.trim() || !form.model.trim() || !form.envKey.trim()) {
      setModelMsg('Please fill in the display name, the model name, and the key name.');
      return;
    }
    setSavingModel(true);
    try {
      const res = await fetch('/api/admin-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to add model');
      const savedKey = form.envKey;
      setForm(EMPTY_FORM);
      setModelMsg('Added. Now set ' + savedKey + ' in Vercel with the API key, then redeploy.');
      await loadModels();
    } catch (err) {
      setModelMsg(err instanceof Error ? err.message : 'Failed to add model');
    } finally {
      setSavingModel(false);
    }
  }

  async function removeModel(docId: string) {
    try {
      const res = await fetch('/api/admin-models', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to remove model');
      await loadModels();
    } catch (err) {
      setModelMsg(err instanceof Error ? err.message : 'Failed to remove model');
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)] min-h-[460px]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
        <span className="inline-flex items-center gap-1.5 px-1 text-sm font-semibold text-[var(--color-text)]">
          <Wand2 className="h-4 w-4 text-[var(--color-accent)]" /> Admin AI
        </span>
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            title="Choose the AI model for the Admin AI"
            className="max-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-accent)]"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label + (m.keySet ? '' : ' — set key')}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setManagerOpen(true)}
            title="Manage models"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
          >
            <Settings className="h-4 w-4" /> Models
          </button>
        </div>
      </div>

      {managerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setManagerOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[26rem] max-w-[92vw] flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--color-text)]">Manage AI models</span>
              <button
                type="button"
                onClick={() => setManagerOpen(false)}
                className="rounded-md p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                {models.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-[var(--color-text)]">{m.label}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
                        <span className="rounded bg-[var(--color-bg-muted)] px-1.5 py-0.5">{m.provider}</span>
                        <span>{m.custom ? 'custom' : 'built-in'}</span>
                        {m.keySet ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <Check className="h-3 w-3" /> key set
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <AlertTriangle className="h-3 w-3" /> add {m.envKey}
                          </span>
                        )}
                      </div>
                    </div>
                    {m.custom ? (
                      <button
                        type="button"
                        onClick={() => removeModel(m.docId)}
                        title="Remove model"
                        className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)] hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="px-1 text-[10px] text-[var(--color-text-tertiary)]">locked</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                <div className="mb-2 text-sm font-semibold text-[var(--color-text)]">Add a model</div>
                <div className="space-y-2">
                  <input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Display name (e.g. Llama 3.3 70B)"
                    className={INPUT_CLS}
                  />
                  <select
                    value={form.provider}
                    onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2.5 py-1.5 text-sm text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="openrouter">OpenRouter</option>
                    <option value="openai">OpenAI</option>
                    <option value="mistral">Mistral</option>
                    <option value="gemini">Gemini (Google)</option>
                    <option value="custom">Custom (OpenAI-compatible)</option>
                  </select>
                  <input
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    placeholder="Model name (e.g. meta-llama/llama-3.3-70b-instruct)"
                    className={INPUT_CLS}
                  />
                  <input
                    value={form.envKey}
                    onChange={(e) => setForm((f) => ({ ...f, envKey: e.target.value }))}
                    placeholder="Key name in Vercel (e.g. OPENROUTER_API_KEY)"
                    className={INPUT_CLS}
                  />
                  {form.provider === 'custom' && (
                    <input
                      value={form.baseUrl}
                      onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                      placeholder="Base URL (e.g. https://api.groq.com/openai/v1)"
                      className={INPUT_CLS}
                    />
                  )}
                  <div className="flex items-center gap-4 px-0.5 text-xs text-[var(--color-text-secondary)]">
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={form.vision}
                        onChange={(e) => setForm((f) => ({ ...f, vision: e.target.checked }))}
                      />
                      Reads images
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={form.reasoning}
                        onChange={(e) => setForm((f) => ({ ...f, reasoning: e.target.checked }))}
                      />
                      Reasoning
                    </label>
                  </div>
                  <p className="text-[11px] leading-5 text-[var(--color-text-tertiary)]">
                    After adding, open Vercel → Settings → Environment Variables, add a variable with
                    the exact key name above and your API key as its value, then redeploy.
                  </p>
                  <button
                    type="button"
                    onClick={addModel}
                    disabled={savingModel}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {savingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Add model
                  </button>
                  {modelMsg && (
                    <p className="text-[11px] leading-5 text-[var(--color-text-secondary)]">{modelMsg}</p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="mx-auto mt-8 max-w-md text-center">
            <Wand2 className="mx-auto mb-3 h-7 w-7 text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold text-[var(--color-text)]">Admin AI</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Manage your blog: ask me to list, write, edit, publish, or delete posts. Pick the AI
              model above, or add your own with the Models button.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--color-accent)] px-3.5 py-2 text-sm text-white'
                  : 'max-w-[90%] rounded-2xl rounded-bl-sm bg-[var(--color-bg-muted)] px-3.5 py-2 text-sm text-[var(--color-text)]'
              }
            >
              {m.role === 'assistant' ? <MathText text={m.content} /> : m.content}
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-[var(--color-border)] pt-2">
                  {m.actions.map((a, ai) => (
                    <div
                      key={ai}
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-400"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {a}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-bg-muted)] px-3.5 py-2 text-sm text-[var(--color-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Working…
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex items-end gap-2 border-t border-[var(--color-border)] pt-3"
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
          placeholder="Ask the Admin AI to manage your blog…"
          className="max-h-40 min-h-[42px] flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[var(--color-accent)] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
