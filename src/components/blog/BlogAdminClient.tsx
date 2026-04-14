'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  ImagePlus,
  Lock,
  PencilLine,
  Plus,
  RefreshCcw,
  Save,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import { LIBRARY_ADMIN_PASSWORD } from '@/lib/library-admin';
import { formatDate, slugify } from '@/lib/utils';
import type { BlogPost } from '@/types/blog';

type BlogAdminFormState = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tagsInput: string;
  coverImageUrl: string;
  content: string;
  isPublished: boolean;
};

const initialFormState: BlogAdminFormState = {
  title: '',
  slug: '',
  excerpt: '',
  category: 'Mathematics',
  tagsInput: '',
  coverImageUrl: '',
  content: '',
  isPublished: true,
};

const writingGuide = [
  { label: 'Heading', value: '## Section title' },
  { label: 'Bold', value: '**important idea**' },
  { label: 'Link', value: '[Math StackExchange](https://math.stackexchange.com)' },
  { label: 'Image', value: '![Describe the image](https://...)' },
  { label: 'Inline math', value: '$f(x)=x^2$' },
  { label: 'Block math', value: '$$\\int_0^1 x^2\\,dx = \\frac13$$' },
];

function parsePosts(payload: unknown): BlogPost[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter(Boolean) as BlogPost[];
}

function postToForm(post: BlogPost): BlogAdminFormState {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category: post.category,
    tagsInput: post.tags.join(', '),
    coverImageUrl: post.coverImageUrl,
    content: post.content,
    isPublished: post.isPublished,
  };
}

async function requestPreviewHtml(password: string, content: string) {
  const response = await fetch('/api/blog-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password,
      content,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { html?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Failed to render preview.');
  }

  return payload?.html ?? '';
}

export default function BlogAdminClient() {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogAdminFormState>(initialFormState);
  const [slugTouched, setSlugTouched] = useState(false);

  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [previewHtml, setPreviewHtml] = useState('');

  const [coverUploadFile, setCoverUploadFile] = useState<File | null>(null);
  const [inlineImageFile, setInlineImageFile] = useState<File | null>(null);

  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const inputClasses =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30';

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    setForm((current) => ({
      ...current,
      slug: slugify(current.title),
    }));
  }, [form.title, slugTouched]);

  const applySelectedPost = (post: BlogPost) => {
    setSelectedPostId(post.id);
    setForm(postToForm(post));
    setSlugTouched(true);
    setActiveTab('write');
    setStatusMessage(`Editing "${post.title}".`);
    setErrorMessage('');
  };

  const resetForm = (message = 'Ready for a new post.') => {
    setSelectedPostId(null);
    setForm(initialFormState);
    setSlugTouched(false);
    setActiveTab('write');
    setPreviewHtml('');
    setCoverUploadFile(null);
    setInlineImageFile(null);
    setStatusMessage(message);
    setErrorMessage('');
  };

  const loadPosts = async (postIdToSelect?: string) => {
    setIsLoadingPosts(true);

    try {
      const response = await fetch(
        `/api/blog-posts?admin=1&password=${encodeURIComponent(passwordInput)}`,
        { cache: 'no-store' },
      );

      const payload = (await response.json().catch(() => null)) as
        | BlogPost[]
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && !Array.isArray(payload) ? payload.error ?? 'Failed to load posts.' : 'Failed to load posts.',
        );
      }

      const parsedPosts = parsePosts(payload);
      setPosts(parsedPosts);

      if (postIdToSelect) {
        const match = parsedPosts.find((post) => post.id === postIdToSelect);
        if (match) {
          applySelectedPost(match);
        }
      }
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (passwordInput !== LIBRARY_ADMIN_PASSWORD) {
      setErrorMessage('Invalid admin password.');
      setStatusMessage('');
      return;
    }

    setIsAuthorized(true);
    setErrorMessage('');
    setStatusMessage('Access granted.');
    void loadPosts();
  };

  const insertSnippet = (before: string, after = '', fallback = '') => {
    const textarea = editorRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = form.content.slice(start, end) || fallback;
    const nextContent =
      form.content.slice(0, start) +
      before +
      selectedText +
      after +
      form.content.slice(end);

    setForm((current) => ({ ...current, content: nextContent }));
    setActiveTab('write');

    requestAnimationFrame(() => {
      textarea.focus();
      const caretPosition = start + before.length + selectedText.length;
      textarea.setSelectionRange(caretPosition, caretPosition);
    });
  };

  const refreshPreview = async () => {
    if (!isAuthorized) {
      return;
    }

    setIsPreviewLoading(true);
    setErrorMessage('');

    try {
      setPreviewHtml(await requestPreviewHtml(passwordInput, form.content));
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized || activeTab !== 'preview') {
      return;
    }

    setIsPreviewLoading(true);
    const timeout = window.setTimeout(() => {
      void requestPreviewHtml(passwordInput, form.content)
        .then((html) => {
          setPreviewHtml(html);
        })
        .catch((error: Error) => {
          setErrorMessage(error.message);
        })
        .finally(() => {
          setIsPreviewLoading(false);
        });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [activeTab, form.content, isAuthorized, passwordInput]);

  const uploadImage = async (mode: 'cover' | 'inline') => {
    const file = mode === 'cover' ? coverUploadFile : inlineImageFile;
    if (!file) {
      setErrorMessage('Choose an image before uploading.');
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const formData = new FormData();
      formData.append('password', passwordInput);
      formData.append('file', file);

      const response = await fetch('/api/blog-assets', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? 'Failed to upload image.');
      }

      if (mode === 'cover') {
        setForm((current) => ({ ...current, coverImageUrl: payload.url ?? '' }));
        setCoverUploadFile(null);
        const coverInput = document.getElementById('blog-cover-upload') as HTMLInputElement | null;
        if (coverInput) {
          coverInput.value = '';
        }
        setStatusMessage('Cover image uploaded.');
      } else {
        insertSnippet(`\n![Describe the image](${payload.url})\n`);
        setInlineImageFile(null);
        const inlineInput = document.getElementById('blog-inline-upload') as HTMLInputElement | null;
        if (inlineInput) {
          inlineInput.value = '';
        }
        setStatusMessage('Image uploaded and inserted into the editor.');
      }
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await fetch(
        selectedPostId ? `/api/blog-posts/${selectedPostId}` : '/api/blog-posts',
        {
          method: selectedPostId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: passwordInput,
            title: form.title,
            slug: form.slug,
            excerpt: form.excerpt,
            category: form.category,
            tags: form.tagsInput,
            coverImageUrl: form.coverImageUrl,
            content: form.content,
            isPublished: form.isPublished,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save post.');
      }

      const savedId = payload?.id ?? selectedPostId ?? undefined;
      setStatusMessage(selectedPostId ? 'Post updated successfully.' : 'Post created successfully.');
      await loadPosts(savedId);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (post: BlogPost) => {
    const confirmed = window.confirm(`Delete "${post.title}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await fetch(`/api/blog-posts/${post.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete post.');
      }

      setStatusMessage(`Deleted "${post.title}".`);
      if (selectedPostId === post.id) {
        resetForm('Post deleted. Ready for a new one.');
      }
      await loadPosts();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-8">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Shield size={16} className="text-[var(--color-accent)]" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Blog Admin
              </p>
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Write and Manage Posts
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
              Write in Markdown, use LaTeX for mathematics like on Math StackExchange, upload images, preview the result, and publish directly to MongoDB.
            </p>
          </div>

          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={14} />
            Back to Blog
          </Link>
        </div>

        {!isAuthorized ? (
          <div className="mt-12 flex justify-center">
            <form
              onSubmit={handleUnlock}
              className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-8"
            >
              <div className="mb-6 flex items-center justify-center">
                <div className="rounded-full bg-[var(--color-bg-elevated)] p-4">
                  <Lock size={24} className="text-[var(--color-accent)]" />
                </div>
              </div>
              <h2 className="mb-1 text-center text-lg font-bold">Authentication Required</h2>
              <p className="mb-6 text-center text-xs text-[var(--color-text-secondary)]">
                Enter your admin password to open the blog editor.
              </p>
              <input
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                className={inputClasses}
                placeholder="Admin password"
                required
              />
              <button
                type="submit"
                className="mt-4 w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-all hover:opacity-90"
              >
                Unlock
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[1.3fr_0.7fr]">
            <form onSubmit={handleSave} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PencilLine size={18} className="text-[var(--color-accent)]" />
                  <h2 className="text-lg font-bold">{selectedPostId ? 'Edit Post' : 'New Post'}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => resetForm()}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    <Plus size={14} />
                    New Post
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshPreview()}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    <RefreshCcw size={14} />
                    Refresh Preview
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Post title"
                    required
                    className={inputClasses}
                  />
                  <input
                    value={form.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
                    }}
                    placeholder="post-slug"
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    placeholder="Category"
                    className={inputClasses}
                  />
                  <input
                    value={form.tagsInput}
                    onChange={(event) => setForm((current) => ({ ...current, tagsInput: event.target.value }))}
                    placeholder="analysis, topology, study tips"
                    className={inputClasses}
                  />
                </div>

                <textarea
                  value={form.excerpt}
                  onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
                  rows={3}
                  placeholder="Short summary for the blog list. Leave empty to generate one automatically."
                  className={`${inputClasses} resize-none`}
                />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                  <input
                    value={form.coverImageUrl}
                    onChange={(event) => setForm((current) => ({ ...current, coverImageUrl: event.target.value }))}
                    placeholder="Cover image URL"
                    className={inputClasses}
                  />
                  <div className="flex flex-col gap-2">
                    <input
                      id="blog-cover-upload"
                      type="file"
                      accept="image/*"
                      onChange={(event) => setCoverUploadFile(event.target.files?.[0] ?? null)}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#0f0e0d]"
                    />
                    <button
                      type="button"
                      onClick={() => void uploadImage('cover')}
                      disabled={isUploadingImage}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload size={14} />
                      Upload Cover
                    </button>
                  </div>
                </div>

                <label className="inline-flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
                    className="h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                  />
                  <span className="text-sm text-[var(--color-text-secondary)]">Publish this post on the website</span>
                </label>

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('write')}
                        className={`rounded-lg px-3 py-2 text-sm transition-colors ${activeTab === 'write' ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        className={`rounded-lg px-3 py-2 text-sm transition-colors ${activeTab === 'preview' ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}
                      >
                        Preview
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => insertSnippet('## ', '', 'Section title')} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">H2</button>
                      <button type="button" onClick={() => insertSnippet('**', '**', 'bold text')} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">Bold</button>
                      <button type="button" onClick={() => insertSnippet('[', '](https://example.com)', 'link text')} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">Link</button>
                      <button type="button" onClick={() => insertSnippet('$', '$', 'x^2 + y^2 = z^2')} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">Inline Math</button>
                      <button type="button" onClick={() => insertSnippet('\n$$\n', '\n$$\n', '\\int_0^1 x^2\\,dx = \\frac13')} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">Block Math</button>
                    </div>
                  </div>

                  <div className="border-b border-[var(--color-border)] px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        id="blog-inline-upload"
                        type="file"
                        accept="image/*"
                        onChange={(event) => setInlineImageFile(event.target.files?.[0] ?? null)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#0f0e0d] md:w-auto"
                      />
                      <button
                        type="button"
                        onClick={() => void uploadImage('inline')}
                        disabled={isUploadingImage}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ImagePlus size={14} />
                        Upload Image and Insert
                      </button>
                    </div>
                  </div>

                  {activeTab === 'write' ? (
                    <textarea
                      ref={editorRef}
                      value={form.content}
                      onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                      rows={20}
                      placeholder="Write your post here. Use Markdown for formatting and LaTeX for mathematics."
                      className="min-h-[520px] w-full resize-y bg-transparent px-4 py-4 font-mono text-sm leading-7 text-[var(--color-text)] outline-none"
                    />
                  ) : (
                    <div className="min-h-[520px] px-4 py-4">
                      {isPreviewLoading ? (
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-6 text-sm text-[var(--color-text-secondary)]">
                          Rendering preview...
                        </div>
                      ) : (
                        <div className="prose-academic" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={15} />
                    {isSaving ? 'Saving...' : selectedPostId ? 'Update Post' : 'Publish Post'}
                  </button>

                  {selectedPostId ? (
                    <button
                      type="button"
                      onClick={() => {
                        const current = posts.find((post) => post.id === selectedPostId);
                        if (current) {
                          void handleDelete(current);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-5 py-2.5 text-sm font-medium text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10"
                    >
                      <Trash2 size={15} />
                      Delete Post
                    </button>
                  ) : null}
                </div>
              </div>
            </form>

            <div className="space-y-6">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Eye size={18} className="text-[var(--color-accent)]" />
                  <h2 className="text-lg font-bold">Writing Help</h2>
                </div>
                <p className="mb-4 text-sm leading-6 text-[var(--color-text-secondary)]">
                  The editor follows the same idea as Math StackExchange: write in Markdown, use LaTeX for mathematics, and preview before publishing.
                </p>
                <div className="space-y-3">
                  {writingGuide.map((item) => (
                    <div key={item.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                        {item.label}
                      </p>
                      <code className="text-xs text-[var(--color-text)]">{item.value}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-6">
                <div className="mb-6 flex items-center gap-2">
                  <Upload size={18} className="text-[var(--color-accent)]" />
                  <h2 className="text-lg font-bold">Existing Posts</h2>
                  <span className="ml-auto text-xs text-[var(--color-text-tertiary)]">{posts.length} total</span>
                </div>

                {isLoadingPosts ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 animate-pulse">
                        <div className="mb-2 h-4 w-2/3 rounded bg-[var(--color-bg-elevated)]" />
                        <div className="h-3 w-1/2 rounded bg-[var(--color-bg-elevated)]" />
                      </div>
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                    No blog posts yet. Create your first one from the editor.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className={`rounded-xl border p-4 transition-all ${selectedPostId === post.id ? 'border-[var(--color-accent)] bg-[var(--color-bg)]' : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]/40'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button type="button" onClick={() => applySelectedPost(post)} className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-semibold text-[var(--color-text)]">{post.title}</p>
                            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                              {post.isPublished ? 'Published' : 'Draft'} · {post.category}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                              Updated {formatDate(post.updatedAt || post.createdAt)}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(post)}
                            className="rounded-lg border border-red-500/30 p-2 text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10"
                            title="Delete post"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {statusMessage ? (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-5 py-3 text-sm text-emerald-300">
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-950/20 px-5 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
