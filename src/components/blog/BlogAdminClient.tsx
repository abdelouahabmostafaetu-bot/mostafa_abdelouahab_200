'use client';

import Link from 'next/link';
import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
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
  Sigma,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import SiteIcon from '@/components/ui/SiteIcon';
import { formatDate, slugify } from '@/lib/utils';
import type { BlogPost } from '@/types/blog';

type BlogAdminFormState = {
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

type AutosavedDraft = {
  selectedPostId: string | null;
  form: BlogAdminFormState;
  savedAt: string;
};

const AUTOSAVE_KEY = 'blog-admin-autosave-v2';
const BLOG_IMAGE_ACCEPT = 'image/png,image/jpeg,image/jpg';
const BLOG_IMAGE_MAX_SIZE = 4 * 1024 * 1024;
const BLOG_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

const initialFormState: BlogAdminFormState = {
  title: '',
  slug: '',
  excerpt: '',
  category: 'Mathematics',
  tags: [],
  coverImageUrl: '',
  content: '',
  isPublished: true,
};

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
    category: post.category || 'Mathematics',
    tags: post.tags ?? [],
    coverImageUrl: post.coverImageUrl,
    content: post.content,
    isPublished: post.isPublished,
  };
}

function hasDraftContent(form: BlogAdminFormState): boolean {
  return Boolean(
    form.title.trim() ||
      form.slug.trim() ||
      form.excerpt.trim() ||
      form.category.trim() !== 'Mathematics' ||
      form.tags.length ||
      form.coverImageUrl.trim() ||
      form.content.trim(),
  );
}

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

type BlogAdminClientProps = {
  initialPostId?: string;
};

export default function BlogAdminClient({ initialPostId = '' }: BlogAdminClientProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const imagePopoverRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<string[]>([initialFormState.content]);
  const historyIndexRef = useRef(0);
  const toastIdRef = useRef(0);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogAdminFormState>(initialFormState);
  const [slugTouched, setSlugTouched] = useState(false);

  const [mode, setMode] = useState<PreviewMode>('write');
  const [previewHtml, setPreviewHtml] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [imageTab, setImageTab] = useState<ImageTab>('url');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('Blog image');
  const [imageUploadFile, setImageUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [autosavedAt, setAutosavedAt] = useState('');
  const [showRestoreDraft, setShowRestoreDraft] = useState(false);
  const [pendingRestoreDraft, setPendingRestoreDraft] = useState<AutosavedDraft | null>(null);
  const [pendingDeletePost, setPendingDeletePost] = useState<BlogPost | null>(null);

  const inputClasses =
    'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all duration-150 placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15';

  const pushHistory = (content: string) => {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (nextHistory[nextHistory.length - 1] === content) {
      return;
    }

    nextHistory.push(content);
    historyRef.current = nextHistory.slice(-150);
    historyIndexRef.current = historyRef.current.length - 1;
  };

  const resetHistory = (content: string) => {
    historyRef.current = [content];
    historyIndexRef.current = 0;
  };

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

  const clearAutosave = () => {
    window.localStorage.removeItem(AUTOSAVE_KEY);
    setAutosavedAt('');
    setPendingRestoreDraft(null);
    setShowRestoreDraft(false);
  };

  const applySelectedPost = (post: BlogPost) => {
    const nextForm = postToForm(post);
    setSelectedPostId(post.id);
    setForm(nextForm);
    setSlugTouched(true);
    setPreviewHtml('');
    setErrorMessage('');
    setMode('write');
    resetHistory(nextForm.content);
  };

  const resetComposer = () => {
    setSelectedPostId(null);
    setForm(initialFormState);
    setSlugTouched(false);
    setPreviewHtml('');
    setErrorMessage('');
    setMode('write');
    setImageUploadFile(null);
    setIsImagePopoverOpen(false);
    resetHistory(initialFormState.content);
  };

  const loadPosts = async (postIdToSelect?: string) => {
    try {
      const response = await fetch('/api/blog-posts?admin=1', {
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as
        | BlogPost[]
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && !Array.isArray(payload)
            ? payload.error ?? 'Failed to load posts.'
            : 'Failed to load posts.',
        );
      }

      const nextPosts = parsePosts(payload);
      setPosts(nextPosts);

      if (postIdToSelect) {
        const match = nextPosts.find((post) => post.id === postIdToSelect);
        if (match) {
          applySelectedPost(match);
        } else {
          setErrorMessage('Post not found for editing.');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load posts.';
      setErrorMessage(message);
      showToast('error', message);
    }
  };

  useEffect(() => {
    void loadPosts(initialPostId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPostId]);

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    setForm((current) => ({
      ...current,
      slug: slugify(current.title),
    }));
  }, [form.title, slugTouched]);

  useEffect(() => {
    if (initialPostId) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<AutosavedDraft>;
      if (!parsed.form || !hasDraftContent(parsed.form as BlogAdminFormState)) {
        return;
      }

      setPendingRestoreDraft({
        selectedPostId: parsed.selectedPostId ?? null,
        form: parsed.form as BlogAdminFormState,
        savedAt: String(parsed.savedAt ?? ''),
      });
      setShowRestoreDraft(true);
    } catch {
      window.localStorage.removeItem(AUTOSAVE_KEY);
    }
  }, [initialPostId]);

  useEffect(() => {
    if (mode !== 'preview') {
      return;
    }

    setIsPreviewLoading(true);
    const timeout = window.setTimeout(() => {
      void requestPreviewHtml(form.content)
        .then((html) => {
          setPreviewHtml(html);
          setErrorMessage('');
        })
        .catch((error: Error) => {
          setErrorMessage(error.message);
          showToast('error', error.message);
        })
        .finally(() => {
          setIsPreviewLoading(false);
        });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [form.content, mode]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!hasDraftContent(form)) {
        window.localStorage.removeItem(AUTOSAVE_KEY);
        return;
      }

      const payload: AutosavedDraft = {
        selectedPostId,
        form,
        savedAt: new Date().toISOString(),
      };

      window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
      setAutosavedAt(payload.savedAt);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [form, selectedPostId]);

  useEffect(() => {
    if (!isImagePopoverOpen && !pendingDeletePost && !showRestoreDraft) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isImagePopoverOpen &&
        imagePopoverRef.current &&
        !imagePopoverRef.current.contains(target)
      ) {
        setIsImagePopoverOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setIsImagePopoverOpen(false);
      setPendingDeletePost(null);
      setShowRestoreDraft(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isImagePopoverOpen, pendingDeletePost, showRestoreDraft]);

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
  };

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      return;
    }

    historyIndexRef.current += 1;
    const nextContent = historyRef.current[historyIndexRef.current] ?? '';
    setForm((current) => ({ ...current, content: nextContent }));
    setMode('write');
  };

  const togglePreview = () => {
    setMode((current) => (current === 'write' ? 'preview' : 'write'));
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

  const persistPost = async (isPublished: boolean) => {
    if (!form.title.trim() || !form.content.trim()) {
      const message = 'Title and content are required.';
      setErrorMessage(message);
      showToast('error', message);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const response = await fetch(
        selectedPostId ? `/api/blog-posts/${selectedPostId}` : '/api/blog-posts',
        {
          method: selectedPostId ? 'PUT' : 'POST',
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
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | (Partial<BlogPost> & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save post.');
      }

      const savedId = String(payload?.id ?? selectedPostId ?? '');
      setForm((current) => ({ ...current, isPublished }));
      clearAutosave();
      setSlugTouched(true);
      showToast(
        'success',
        isPublished ? 'Post published successfully.' : 'Draft saved successfully.',
      );
      await loadPosts(savedId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save post.';
      setErrorMessage(message);
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (!pendingDeletePost) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/blog-posts/${pendingDeletePost.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete post.');
      }

      const removedId = pendingDeletePost.id;
      const removedTitle = pendingDeletePost.title;
      setPendingDeletePost(null);
      if (selectedPostId === removedId) {
        resetComposer();
      }
      await loadPosts();
      showToast('success', `Deleted "${removedTitle}".`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete post.';
      setErrorMessage(message);
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const restoreDraft = () => {
    if (!pendingRestoreDraft) {
      return;
    }

    setSelectedPostId(pendingRestoreDraft.selectedPostId);
    setForm(pendingRestoreDraft.form);
    setSlugTouched(Boolean(pendingRestoreDraft.form.slug));
    setAutosavedAt(pendingRestoreDraft.savedAt);
    setPreviewHtml('');
    setMode('write');
    resetHistory(pendingRestoreDraft.form.content);
    setShowRestoreDraft(false);
    showToast('info', 'Unsaved draft restored.');
  };

  const discardDraft = () => {
    clearAutosave();
    showToast('info', 'Unsaved draft discarded.');
  };

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const hasModifier = event.ctrlKey || event.metaKey;

    if (event.key === 'Tab') {
      event.preventDefault();
      insertBlock('  ');
      return;
    }

    if (!hasModifier) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'b') {
      event.preventDefault();
      insertSnippet('**', '**', 'text');
      return;
    }

    if (key === 'i') {
      event.preventDefault();
      insertSnippet('*', '*', 'text');
      return;
    }

    if (key === 'k') {
      event.preventDefault();
      insertSnippet('`', '`', 'code');
      return;
    }

    if (key === 'm' && event.shiftKey) {
      event.preventDefault();
      insertBlock('\n$$\nA v = \\lambda v\n$$\n');
      return;
    }

    if (key === 'm') {
      event.preventDefault();
      insertSnippet('$', '$', 'x^2 + y^2 = z^2');
      return;
    }

    if (key === 'l') {
      event.preventDefault();
      insertSnippet('[', '](url)', 'text');
      return;
    }

    if (key === 's') {
      event.preventDefault();
      void persistPost(true);
      return;
    }

    if (key === 'p' && event.shiftKey) {
      event.preventDefault();
      togglePreview();
    }
  };

  const handleToolbarMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const currentPost = posts.find((post) => post.id === selectedPostId) ?? null;
  const toolbarButtonClasses =
    'inline-flex h-8 items-center justify-center gap-1 rounded px-2 text-xs font-medium text-[var(--color-text-secondary)] transition-all duration-150 hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]';
  const iconSize = 15;

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <SiteIcon name="notebook" alt="" className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                Blog Admin
              </p>
            </div>
            <h1
              className="text-2xl font-semibold sm:text-3xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Write a blog post
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
              A practical Markdown editor for academic notes, LaTeX, and clean post management.
            </p>
          </div>

          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={14} />
            Back to blog
          </Link>
        </div>

        {errorMessage ? (
          <div className="mb-6 rounded-md border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-6">
            <div className="mx-auto w-full max-w-4xl">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
                      {currentPost ? 'Editing post' : 'New post'}
                    </p>
                    <button
                      type="button"
                      onClick={resetComposer}
                      className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      <SiteIcon name="add" alt="" className="h-4 w-4" />
                      New post
                    </button>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] px-4 py-5 sm:px-6">
                  <div className="space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3">
                      <input
                        value={form.title}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Title"
                        className="w-full border-0 bg-transparent px-0 py-1 text-2xl font-semibold text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)] sm:text-3xl"
                        style={{ fontFamily: 'var(--font-serif)' }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                      <p className="text-[var(--color-text-secondary)]">
                        {form.isPublished ? 'Ready to publish' : 'Saving as draft'}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            isPublished: !current.isPublished,
                          }))
                        }
                        className={`relative inline-flex h-8 w-16 items-center rounded-full border transition-all duration-200 ${
                          form.isPublished
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20'
                            : 'border-[var(--color-border)] bg-[var(--color-bg)]'
                        }`}
                        aria-pressed={form.isPublished}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-[var(--color-accent)] transition-all duration-200 ${
                            form.isPublished
                              ? 'left-9'
                              : 'left-1 bg-[var(--color-text-secondary)]'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-5 sm:px-6">
                  <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] transition-all duration-200 focus-within:border-[var(--color-accent)]">
                    <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-muted)]/60 px-2 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertHeading(2)}
                            className={toolbarButtonClasses}
                            title="Heading 2"
                          >
                            <Heading2 size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertSnippet('**', '**', 'text')}
                            className={toolbarButtonClasses}
                            title="Bold (Ctrl+B)"
                          >
                            <Bold size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertSnippet('*', '*', 'text')}
                            className={toolbarButtonClasses}
                            title="Italic (Ctrl+I)"
                          >
                            <Italic size={iconSize} />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertSnippet('`', '`', 'code')}
                            className={toolbarButtonClasses}
                            title="Inline code (Ctrl+K)"
                          >
                            <Code2 size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertSnippet('$', '$', 'x^2 + y^2 = z^2')}
                            className={toolbarButtonClasses}
                            title="Inline math (Ctrl+M)"
                          >
                            <Sigma size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertBlock('\n$$\nA v = \\lambda v\n$$\n')}
                            className={toolbarButtonClasses}
                            title="LaTeX block (Ctrl+Shift+M)"
                          >
                            <Sigma size={iconSize} />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertSnippet('[', '](url)', 'text')}
                            className={toolbarButtonClasses}
                            title="Insert link (Ctrl+L)"
                          >
                            <Link2 size={iconSize} />
                            Link
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onMouseDown={handleToolbarMouseDown}
                              onClick={() => setIsImagePopoverOpen((current) => !current)}
                              className={toolbarButtonClasses}
                              title="Insert image"
                            >
                              <ImagePlus size={iconSize} />
                              Upload Image
                            </button>

                            {isImagePopoverOpen ? (
                              <div
                                ref={imagePopoverRef}
                                className="absolute left-0 top-10 z-20 w-[min(92vw,20rem)] rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)]"
                              >
                                <div className="mb-3 flex rounded-md border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-1">
                                  <button
                                    type="button"
                                    onClick={() => setImageTab('url')}
                                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                                      imageTab === 'url'
                                        ? 'bg-[var(--color-accent)] text-[#0f0e0d]'
                                        : 'text-[var(--color-text-secondary)]'
                                    }`}
                                  >
                                    Paste URL
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setImageTab('upload')}
                                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                                      imageTab === 'upload'
                                        ? 'bg-[var(--color-accent)] text-[#0f0e0d]'
                                        : 'text-[var(--color-text-secondary)]'
                                    }`}
                                  >
                                    Upload
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  <input
                                    value={imageAltInput}
                                    onChange={(event) => setImageAltInput(event.target.value)}
                                    placeholder="Alt text"
                                    className={inputClasses}
                                  />

                                  {imageTab === 'url' ? (
                                    <>
                                      <input
                                        value={imageUrlInput}
                                        onChange={(event) => setImageUrlInput(event.target.value)}
                                        placeholder="https://..."
                                        className={inputClasses}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => insertImageMarkdown(imageUrlInput, imageAltInput)}
                                        className="inline-flex w-full items-center justify-center rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d]"
                                      >
                                        Insert image
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <input
                                        ref={imageUploadInputRef}
                                        type="file"
                                        accept={BLOG_IMAGE_ACCEPT}
                                        className="hidden"
                                        onChange={(event) =>
                                          setImageUploadFile(event.target.files?.[0] ?? null)
                                        }
                                      />
                                      <button
                                        type="button"
                                        onClick={() => imageUploadInputRef.current?.click()}
                                        onDragOver={(event) => {
                                          event.preventDefault();
                                          setIsDraggingImage(true);
                                        }}
                                        onDragLeave={() => setIsDraggingImage(false)}
                                        onDrop={(event) => {
                                          event.preventDefault();
                                          setIsDraggingImage(false);
                                          const file = event.dataTransfer.files?.[0];
                                          if (file) {
                                            setImageUploadFile(file);
                                          }
                                        }}
                                        className={`flex w-full flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center text-sm transition-all ${
                                          isDraggingImage
                                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                                        }`}
                                      >
                                        <Upload size={16} className="mb-2" />
                                        Drop an image here or click to choose a file
                                      </button>
                                      {imageUploadFile ? (
                                        <p className="text-xs text-[var(--color-text-secondary)]">
                                          {imageUploadFile.name}
                                        </p>
                                      ) : null}
                                      {isUploadingImage && uploadProgress > 0 ? (
                                        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                                          <div
                                            className="h-full bg-[var(--color-accent)] transition-all"
                                            style={{ width: `${uploadProgress}%` }}
                                          />
                                        </div>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => void handleInlineImageUpload()}
                                        disabled={isUploadingImage}
                                        className="inline-flex w-full items-center justify-center rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d] disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {isUploadingImage ? 'Uploading...' : 'Upload and insert'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertBlock('\n\n---\n\n')}
                            className={toolbarButtonClasses}
                            title="Horizontal rule"
                          >
                            <Minus size={iconSize} />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => prefixSelectedLines('1. ', 'item')}
                            className={toolbarButtonClasses}
                            title="Ordered list"
                          >
                            <ListOrdered size={iconSize} />
                            Numbered list
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => prefixSelectedLines('- ', 'item')}
                            className={toolbarButtonClasses}
                            title="Unordered list"
                          >
                            <List size={iconSize} />
                            Bulleted list
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => prefixSelectedLines('> ', 'quote')}
                            className={toolbarButtonClasses}
                            title="Blockquote"
                          >
                            <Quote size={iconSize} />
                            Quote
                          </button>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onMouseDown={handleToolbarMouseDown}
                              onClick={handleUndo}
                              className={toolbarButtonClasses}
                              title="Undo"
                            >
                              <Undo2 size={iconSize} />
                            </button>
                            <button
                              type="button"
                              onMouseDown={handleToolbarMouseDown}
                              onClick={handleRedo}
                              className={toolbarButtonClasses}
                              title="Redo"
                            >
                              <Redo2 size={iconSize} />
                            </button>
                          </div>

                          <div className="flex rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
                            <button
                              type="button"
                              onClick={() => setMode('write')}
                              className={`rounded px-3 py-1.5 text-xs font-semibold transition-all ${
                                mode === 'write'
                                  ? 'bg-[var(--color-accent)] text-[#0f0e0d]'
                                  : 'text-[var(--color-text-secondary)]'
                              }`}
                            >
                              Write
                            </button>
                            <button
                              type="button"
                              onClick={() => setMode('preview')}
                              className={`rounded px-3 py-1.5 text-xs font-semibold transition-all ${
                                mode === 'preview'
                                  ? 'bg-[var(--color-accent)] text-[#0f0e0d]'
                                  : 'text-[var(--color-text-secondary)]'
                              }`}
                            >
                              Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative min-h-[350px]">
                      {mode === 'write' ? (
                        <textarea
                          ref={editorRef}
                          value={form.content}
                          onChange={handleEditorChange}
                          onKeyDown={handleEditorKeyDown}
                          placeholder="Write your post in Markdown. Use $...$ for inline math and $$...$$ for display math."
                          className="min-h-[350px] w-full resize-y border-0 bg-transparent px-4 py-4 font-mono text-sm leading-7 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)] sm:px-5"
                          style={{
                            fontFamily:
                              '"JetBrains Mono", "Fira Code", Consolas, monospace',
                          }}
                        />
                      ) : (
                        <div className="min-h-[350px] px-4 py-4 sm:px-5">
                          {isPreviewLoading ? (
                            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 py-6 text-sm text-[var(--color-text-secondary)]">
                              Rendering preview...
                            </div>
                          ) : (
                            <div
                              className="blog-content prose-academic max-w-none"
                              style={{ fontFamily: 'var(--font-serif)' }}
                              dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg-muted)]/95 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-5">
                        <button
                          type="button"
                          onClick={() => void persistPost(false)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <SiteIcon name="document" alt="" className="h-4 w-4" />
                          Save draft
                        </button>
                        <button
                          type="button"
                          onClick={() => void persistPost(true)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <SiteIcon name="document" alt="" className="h-4 w-4" />
                          {isSaving ? 'Saving...' : currentPost ? 'Update post' : 'Publish post'}
                        </button>
                        {currentPost ? (
                          <button
                            type="button"
                            onClick={() => setPendingDeletePost(currentPost)}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-300 transition-all duration-150 hover:border-red-400/60 hover:bg-red-500/10"
                          >
                            <SiteIcon name="delete" alt="" className="h-4 w-4" />
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

          </div>

        {showRestoreDraft && pendingRestoreDraft ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4">
            <div className="w-full max-w-md rounded-[28px] border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <h3
                className="text-2xl font-semibold"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Restore unsaved draft?
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                A local draft was autosaved on this device. You can restore it or
                discard it and continue with the current data.
              </p>
              {pendingRestoreDraft.savedAt ? (
                <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                  Saved {formatDate(pendingRestoreDraft.savedAt)}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={discardDraft}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={restoreDraft}
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[#0f0e0d]"
                >
                  Restore draft
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {pendingDeletePost ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4">
            <div className="w-full max-w-md rounded-[28px] border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <h3
                className="text-2xl font-semibold"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Delete this post?
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                <span>&quot;{pendingDeletePost.title}&quot;</span> will be removed from
                MongoDB and cannot be recovered from this editor.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPendingDeletePost(null)}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeletePost()}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Deleting...' : 'Delete post'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.25)] ${
                toast.type === 'success'
                  ? 'border-emerald-500/25 bg-emerald-500/12 text-emerald-100'
                  : toast.type === 'error'
                    ? 'border-red-500/25 bg-red-500/12 text-red-100'
                    : 'border-sky-500/25 bg-sky-500/12 text-sky-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p>{toast.message}</p>
                <button
                  type="button"
                  onClick={() =>
                    setToasts((current) =>
                      current.filter((currentToast) => currentToast.id !== toast.id),
                    )
                  }
                  className="text-current/80 transition hover:text-current"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

