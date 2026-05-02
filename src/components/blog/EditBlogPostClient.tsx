'use client';

import Link from 'next/link';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Bold,
  Code2,
  Eye,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react';
import { formatDate, slugify } from '@/lib/utils';
import type { BlogPost } from '@/types/blog';

type BlogFormState = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  coverImageUrl: string;
  content: string;
  isPublished: boolean;
};

type PreviewMode = 'write' | 'preview';
type ToastType = 'success' | 'error' | 'info';
type ImageTab = 'url' | 'upload';

type ToastMessage = {
  id: number;
  type: ToastType;
  message: string;
};

const BLOG_IMAGE_ACCEPT = 'image/png,image/jpeg,image/jpg';
const BLOG_IMAGE_MAX_SIZE = 4 * 1024 * 1024;
const BLOG_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

function parseUploadResponse(responseText: string) {
  try {
    return JSON.parse(responseText || '{}') as {
      url?: string;
      markdown?: string;
      error?: string;
    };
  } catch {
    return { error: 'Failed to upload image.' };
  }
}

function validateBlogImageFile(file: File): string | null {
  if (!BLOG_IMAGE_TYPES.has(file.type)) {
    return 'Only PNG, JPG, and JPEG images are allowed.';
  }

  if (file.size > BLOG_IMAGE_MAX_SIZE) {
    return 'Images must be smaller than 4 MB.';
  }

  return null;
}

function createImageMarkdown(url: string, altText: string) {
  return `![${altText.trim() || 'Blog image'}](${url})`;
}

async function requestPreviewHtml(content: string) {
  const response = await fetch('/api/blog-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { html?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Failed to render preview.');
  }

  return payload?.html ?? '';
}

export default function EditBlogPostClient({ postId }: { postId: string }) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const imagePopoverRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(0);
  const toastIdRef = useRef(0);

  const [form, setForm] = useState<BlogFormState>({
    title: '',
    slug: '',
    excerpt: '',
    category: 'Mathematics',
    tags: [],
    coverImageUrl: '',
    content: '',
    isPublished: true,
  });
  const [slugTouched, setSlugTouched] = useState(false);

  const [mode, setMode] = useState<PreviewMode>('write');
  const [previewHtml, setPreviewHtml] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [imageTab, setImageTab] = useState<ImageTab>('url');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('Blog image');
  const [imageUploadFile, setImageUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [historyControls, setHistoryControls] = useState({
    canUndo: false,
    canRedo: false,
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [post, setPost] = useState<BlogPost | null>(null);

  const inputClasses =
    'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all duration-150 placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15';

  const syncHistoryControls = useCallback(() => {
    setHistoryControls({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1,
    });
  }, []);

  const pushHistory = (content: string) => {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (nextHistory[nextHistory.length - 1] === content) {
      return;
    }

    nextHistory.push(content);
    historyRef.current = nextHistory.slice(-150);
    historyIndexRef.current = historyRef.current.length - 1;
    syncHistoryControls();
  };

  const resetHistory = useCallback((content: string) => {
    historyRef.current = [content];
    historyIndexRef.current = 0;
    syncHistoryControls();
  }, [syncHistoryControls]);

  const showToast = (type: ToastType, message: string) => {
    const id = toastIdRef.current + 1;
    toastIdRef.current = id;
    setToasts((current) => [...current, { id, type, message }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const applyEditorContent = (
    nextContent: string,
    selectionStart?: number,
    selectionEnd?: number,
    pushToHistory = true,
  ) => {
    setForm((current) => ({ ...current, content: nextContent }));
    if (pushToHistory) {
      pushHistory(nextContent);
    }
    setMode('write');

    window.requestAnimationFrame(() => {
      const textarea = editorRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      if (typeof selectionStart === 'number') {
        textarea.setSelectionRange(selectionStart, selectionEnd ?? selectionStart);
      }
    });
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

    const selectionStart = start + before.length;
    const selectionEnd = selectionStart + selectedText.length;
    applyEditorContent(nextContent, selectionStart, selectionEnd);
  };

  const prefixSelectedLines = (prefix: string, fallback: string) => {
    const textarea = editorRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = form.content.slice(start, end) || fallback;
    const transformed = selectedText
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');

    const nextContent =
      form.content.slice(0, start) + transformed + form.content.slice(end);
    applyEditorContent(nextContent, start, start + transformed.length);
  };

  const insertBlock = (value: string, selectOffset = 0) => {
    const textarea = editorRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextContent =
      form.content.slice(0, start) + value + form.content.slice(end);
    const nextSelection = start + value.length - selectOffset;
    applyEditorContent(nextContent, nextSelection, nextSelection);
  };

  const insertHeading = (level: 2 | 3 | 4) => {
    const fallback = level === 2 ? 'Section title' : level === 3 ? 'Subsection title' : 'Detail heading';
    insertSnippet(`${'#'.repeat(level)} `, '', fallback);
  };

  const insertImageMarkdown = (url: string, altText: string) => {
    const safeUrl = url.trim();
    if (!safeUrl) {
      showToast('error', 'Add an image URL first.');
      return;
    }

    if (safeUrl.startsWith('data:image/')) {
      showToast('error', 'Base64 images are not allowed. Upload the image first.');
      return;
    }

    const markdown = `\n${createImageMarkdown(safeUrl, altText)}\n`;
    const textarea = editorRef.current;
    if (!textarea) {
      applyEditorContent(`${form.content}${markdown}`);
    } else {
      insertBlock(markdown);
    }
    setImageUrlInput('');
    setImageAltInput('Blog image');
    setImageUploadFile(null);
    setIsImagePopoverOpen(false);
  };

  const handleEditorChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = event.target.value;
    setForm((current) => ({ ...current, content: nextContent }));
    pushHistory(nextContent);
  };

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) {
      return;
    }

    historyIndexRef.current -= 1;
    const nextContent = historyRef.current[historyIndexRef.current] ?? '';
    setForm((current) => ({ ...current, content: nextContent }));
    setMode('write');
    syncHistoryControls();
  };

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      return;
    }

    historyIndexRef.current += 1;
    const nextContent = historyRef.current[historyIndexRef.current] ?? '';
    setForm((current) => ({ ...current, content: nextContent }));
    setMode('write');
    syncHistoryControls();
  };

  const togglePreview = async () => {
    if (mode === 'preview') {
      setMode('write');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const html = await requestPreviewHtml(form.content);
      setPreviewHtml(html);
      setMode('preview');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to render preview.';
      setErrorMessage(message);
      showToast('error', message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const uploadFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const requestBody = new FormData();
      requestBody.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/blog/upload-image');

      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) {
          return;
        }

        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      });

      xhr.addEventListener('load', () => {
        const payload = parseUploadResponse(xhr.responseText);

        if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
          resolve(payload.url);
          return;
        }

        reject(new Error(payload.error ?? 'Failed to upload image.'));
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Failed to upload image.'));
      });

      xhr.send(requestBody);
    });

  const handleInlineImageUpload = async () => {
    if (!imageUploadFile) {
      showToast('error', 'Choose an image first.');
      return;
    }

    const validationError = validateBlogImageFile(imageUploadFile);
    if (validationError) {
      setErrorMessage(validationError);
      showToast('error', validationError);
      return;
    }

    setIsUploadingImage(true);
    setUploadProgress(0);
    setErrorMessage('');

    try {
      const url = await uploadFile(imageUploadFile);
      insertImageMarkdown(url, imageAltInput);
      showToast('success', 'Image uploaded and inserted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload image.';
      setErrorMessage(message);
      showToast('error', message);
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
      if (imageUploadInputRef.current) {
        imageUploadInputRef.current.value = '';
      }
    }
  };

  const loadPost = useCallback(async () => {
    try {
      const response = await fetch(`/api/blog-posts/${postId}`);
      if (!response.ok) throw new Error('Failed to load post.');
      const postData = (await response.json()) as BlogPost;
      setPost(postData);
      const formData = {
        title: postData.title,
        slug: postData.slug,
        excerpt: postData.excerpt,
        category: postData.category || 'Mathematics',
        tags: postData.tags ?? [],
        coverImageUrl: postData.coverImageUrl,
        content: postData.content,
        isPublished: postData.isPublished,
      };
      setForm(formData);
      setSlugTouched(true);
      resetHistory(formData.content);
    } catch (error) {
      setErrorMessage('Failed to load post for editing.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, resetHistory]);

  const handleUpdate = async (isPublished: boolean) => {
    if (!form.title.trim() || !form.content.trim()) {
      const message = 'Title and content are required.';
      setErrorMessage(message);
      showToast('error', message);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/blog-posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          excerpt: form.excerpt,
          category: form.category,
          tags: form.tags,
          coverImageUrl: form.coverImageUrl,
          content: form.content,
          isPublished,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | (Partial<BlogPost> & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update post.');
      }

      setForm((current) => ({ ...current, isPublished }));
      showToast(
        'success',
        isPublished ? 'Post updated and published.' : 'Draft updated successfully.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update post.';
      setErrorMessage(message);
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    setForm((current) => ({
      ...current,
      slug: slugify(current.title),
    }));
  }, [form.title, slugTouched]);

  if (isLoading) {
    return (
      <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="mb-8 border-b border-[var(--color-border)] pb-6">
            <h1 className="text-3xl font-semibold text-[var(--color-text)]">Edit Blog Post</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Loading post information...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="mb-8 border-b border-[var(--color-border)] pb-6">
            <h1 className="text-3xl font-semibold text-[var(--color-text)]">Edit Blog Post</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Post not found.
            </p>
            <Link
              href="/blog/admin/edit"
              className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
            >
              Back to edit posts
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">Edit Blog Post</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Edit &quot;{post.title}&quot;
          </p>
          <Link
            href="/blog/admin/edit"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to edit posts
          </Link>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Post title"
                required
                className={inputClasses}
              />
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Slug</span>
              <input
                value={form.slug}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, slug: e.target.value }));
                  setSlugTouched(true);
                }}
                placeholder="post-slug"
                className={inputClasses}
              />
            </label>
          </div>

          <label className="block text-sm text-[var(--color-text-secondary)]">
            <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Excerpt</span>
            <input
              value={form.excerpt}
              onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Brief description"
              className={inputClasses}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className={inputClasses}
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Programming">Programming</option>
                <option value="Science">Science</option>
                <option value="Technology">Technology</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Tags</span>
              <input
                value={form.tags.join(', ')}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                }))}
                placeholder="tag1, tag2, tag3"
                className={inputClasses}
              />
            </label>

            <label className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide text-[var(--color-text-secondary)]">Cover Image URL</span>
              <input
                value={form.coverImageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                placeholder="https://..."
                className={inputClasses}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                Content
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!historyControls.canUndo}
                  className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  title="Undo"
                >
                  <Undo2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!historyControls.canRedo}
                  className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  title="Redo"
                >
                  <Redo2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={togglePreview}
                  disabled={isPreviewLoading}
                  className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  title="Toggle Preview"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2">
              <button
                type="button"
                onClick={() => insertSnippet('**', '**', 'bold text')}
                className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                title="Bold"
              >
                <Bold size={16} />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('*', '*', 'italic text')}
                className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                title="Italic"
              >
                <Italic size={16} />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('[', '](url)', 'link text')}
                className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                title="Link"
              >
                <Link2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('`', '`', 'code')}
                className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                title="Inline Code"
              >
                <Code2 size={16} />
              </button>
              <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
              <button
                type="button"
                onClick={() => insertHeading(2)}
                className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                title="Heading 2"
              >
                <Heading2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => prefixSelectedLines('- ', 'List item')}
                className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                title="Bullet List"
              >
                <List size={16} />
              </button>
              <button
                type="button"
                onClick={() => prefixSelectedLines('1. ', 'List item')}
                className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                title="Numbered List"
              >
                <ListOrdered size={16} />
              </button>
              <button
                type="button"
                onClick={() => insertBlock('\n> ', 0)}
                className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                title="Quote"
              >
                <Quote size={16} />
              </button>
              <button
                type="button"
                onClick={() => insertBlock('\n---\n', 0)}
                className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                title="Horizontal Rule"
              >
                <Minus size={16} />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsImagePopoverOpen(!isImagePopoverOpen)}
                  className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                  title="Insert Image"
                >
                  <ImagePlus size={16} />
                </button>
                {isImagePopoverOpen && (
                  <div
                    ref={imagePopoverRef}
                    className="fixed inset-x-3 top-28 z-50 max-h-[calc(100svh-8rem)] overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-lg sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-1 sm:w-80 sm:p-4"
                  >
                    <div className="flex gap-2 border-b border-[var(--color-border)] pb-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setImageTab('url')}
                        className={`px-3 py-1 text-sm rounded ${
                          imageTab === 'url'
                            ? 'bg-[var(--color-accent)] text-[#0f0e0d]'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                        }`}
                      >
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('upload')}
                        className={`px-3 py-1 text-sm rounded ${
                          imageTab === 'upload'
                            ? 'bg-[var(--color-accent)] text-[#0f0e0d]'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                        }`}
                      >
                        Upload
                      </button>
                    </div>

                    {imageTab === 'url' ? (
                      <div className="space-y-3">
                        <input
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className={inputClasses}
                        />
                        <input
                          value={imageAltInput}
                          onChange={(e) => setImageAltInput(e.target.value)}
                          placeholder="Describe the image"
                          className={inputClasses}
                        />
                        <button
                          type="button"
                          onClick={() => insertImageMarkdown(imageUrlInput, imageAltInput)}
                          className="w-full rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[#0f0e0d] transition hover:opacity-90"
                        >
                          Insert Image
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input
                          ref={imageUploadInputRef}
                          type="file"
                          accept={BLOG_IMAGE_ACCEPT}
                          onChange={(e) => setImageUploadFile(e.target.files?.[0] ?? null)}
                          className="w-full text-sm text-[var(--color-text-secondary)] file:mr-4 file:rounded file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1 file:text-sm file:text-[#0f0e0d] file:font-semibold"
                        />
                        <input
                          value={imageAltInput}
                          onChange={(e) => setImageAltInput(e.target.value)}
                          placeholder="Describe the image"
                          className={inputClasses}
                        />
                        {uploadProgress > 0 && (
                          <div className="w-full bg-[var(--color-bg-secondary)] rounded-full h-2">
                            <div
                              className="bg-[var(--color-accent)] h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleInlineImageUpload}
                          disabled={!imageUploadFile || isUploadingImage}
                          className="w-full rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[#0f0e0d] transition hover:opacity-90 disabled:opacity-50"
                        >
                          {isUploadingImage ? 'Uploading...' : 'Upload & Insert'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {mode === 'write' ? (
              <textarea
                ref={editorRef}
                value={form.content}
                onChange={handleEditorChange}
                onKeyDown={(e) => {
                  const hasModifier = e.ctrlKey || e.metaKey;
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    insertBlock('  ');
                    return;
                  }
                  if (!hasModifier) return;
                  const key = e.key.toLowerCase();
                  if (key === 'b') {
                    e.preventDefault();
                    insertSnippet('**', '**', 'bold text');
                  } else if (key === 'i') {
                    e.preventDefault();
                    insertSnippet('*', '*', 'italic text');
                  } else if (key === 'k') {
                    e.preventDefault();
                    insertSnippet('[', '](url)', 'link text');
                  }
                }}
                placeholder="Write your post content here..."
                rows={20}
                className={`${inputClasses} font-mono text-sm resize-none rounded-t-none`}
              />
            ) : (
              <div
                className="blog-content min-h-[400px] rounded-b-md border border-t-0 border-[var(--color-border)] bg-[var(--color-bg)] p-4 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                className="rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-text-secondary)]">Publish immediately</span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleUpdate(false)}
                disabled={isSaving}
                className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleUpdate(true)}
                disabled={isSaving}
                className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#0f0e0d] transition hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 border-l-4 border-red-500/60 bg-[var(--color-bg)]/90 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-3 text-sm shadow-lg ${
              toast.type === 'success'
                ? 'border-l-4 border-emerald-500 bg-emerald-50 text-emerald-800'
                : toast.type === 'error'
                ? 'border-l-4 border-red-500 bg-red-50 text-red-800'
                : 'border-l-4 border-blue-500 bg-blue-50 text-blue-800'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </section>
  );
}
