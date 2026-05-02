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
  ChevronDown,
  ChevronUp,
  Code2,
  Eye,
  Heading2,
  Heading3,
  Heading4,
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

function countWords(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
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

export default function BlogAdminClient() {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const imagePopoverRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<string[]>([initialFormState.content]);
  const historyIndexRef = useRef(0);
  const toastIdRef = useRef(0);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogAdminFormState>(initialFormState);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [mode, setMode] = useState<PreviewMode>('write');
  const [previewHtml, setPreviewHtml] = useState('');

  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = useState(true);
  const [arePostsOpen, setArePostsOpen] = useState(true);
  const [postSearch, setPostSearch] = useState('');

  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [imageTab, setImageTab] = useState<ImageTab>('url');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('Describe the image');
  const [imageUploadFile, setImageUploadFile] = useState<File | null>(null);
  const [coverUploadFile, setCoverUploadFile] = useState<File | null>(null);
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
    'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all duration-150 placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20';

  const filteredPosts = posts.filter((post) => {
    const query = postSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [post.title, post.slug, post.category, ...(post.tags ?? [])]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const wordCount = countWords(form.content);
  const characterCount = form.content.length;

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
    setTagInput('');
    setPreviewHtml('');
    setErrorMessage('');
    setMode('write');
    resetHistory(nextForm.content);
  };

  const resetComposer = () => {
    setSelectedPostId(null);
    setForm(initialFormState);
    setSlugTouched(false);
    setTagInput('');
    setPreviewHtml('');
    setErrorMessage('');
    setMode('write');
    setImageUploadFile(null);
    setCoverUploadFile(null);
    setIsImagePopoverOpen(false);
    resetHistory(initialFormState.content);
  };

  const loadPosts = async (postIdToSelect?: string) => {
    setIsLoadingPosts(true);

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
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load posts.';
      setErrorMessage(message);
      showToast('error', message);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (typeof window === 'undefined') {
      return;
    }

    if (window.innerWidth < 768) {
      setIsMetadataOpen(false);
    }
  }, []);

  useEffect(() => {
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
  }, []);

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

  const addTag = (rawValue: string) => {
    const nextTag = rawValue.replace(/,+$/, '').trim();
    if (!nextTag) {
      return;
    }

    setForm((current) => {
      if (current.tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
        return current;
      }

      return {
        ...current,
        tags: [...current.tags, nextTag],
      };
    });
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setForm((current) => ({
      ...current,
      tags: current.tags.filter((tag) => tag !== tagToRemove),
    }));
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

    insertBlock(`\n![${altText.trim() || 'Describe the image'}](${safeUrl})\n`);
    setImageUrlInput('');
    setImageAltInput('Describe the image');
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
      xhr.open('POST', '/api/blog-assets');

      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) {
          return;
        }

        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      });

      xhr.addEventListener('load', () => {
        const payload = JSON.parse(xhr.responseText || '{}') as {
          url?: string;
          error?: string;
        };

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

  const handleCoverUpload = async (file: File) => {
    setCoverUploadFile(file);
    setIsUploadingImage(true);
    setUploadProgress(0);
    setErrorMessage('');

    try {
      const url = await uploadFile(file);
      setForm((current) => ({ ...current, coverImageUrl: url }));
      setCoverUploadFile(null);
      showToast('success', 'Cover image uploaded.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload cover image.';
      setErrorMessage(message);
      showToast('error', message);
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
      if (coverUploadInputRef.current) {
        coverUploadInputRef.current.value = '';
      }
    }
  };

  const handleInlineImageUpload = async () => {
    if (!imageUploadFile) {
      showToast('error', 'Choose an image first.');
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
    setTagInput('');
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
      insertSnippet('**', '**', 'important idea');
      return;
    }

    if (key === 'i') {
      event.preventDefault();
      insertSnippet('*', '*', 'emphasis');
      return;
    }

    if (key === 'k') {
      event.preventDefault();
      insertSnippet('`', '`', 'inline code');
      return;
    }

    if (key === 'm' && event.shiftKey) {
      event.preventDefault();
      insertSnippet('\n$$\n', '\n$$\n', '\\int_0^1 x^2\\,dx = \\frac13');
      return;
    }

    if (key === 'm') {
      event.preventDefault();
      insertSnippet('$', '$', 'f(x)=x^2');
      return;
    }

    if (key === 'l') {
      event.preventDefault();
      insertSnippet('[', '](https://example.com)', 'link text');
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

  const handleTagKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      event.preventDefault();
      addTag(tagInput);
      return;
    }

    if (event.key === 'Backspace' && !tagInput && form.tags.length) {
      event.preventDefault();
      const lastTag = form.tags[form.tags.length - 1];
      if (lastTag) {
        removeTag(lastTag);
      }
    }
  };

  const handleToolbarMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const currentPost = posts.find((post) => post.id === selectedPostId) ?? null;
  const slugPreview = form.slug.trim() || 'your-slug-here';
  const autosaveLabel = autosavedAt
    ? `Autosaved ${new Date(autosavedAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : 'Autosave active';
  const toolbarButtonClasses =
    'inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-all duration-150 hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text)]';
  const iconSize = 15;

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <SiteIcon name="notebook" alt="" className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Blog Admin
              </p>
            </div>
            <h1
              className="text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Stack-style writing studio
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
              Write in Markdown, preview mathematics with KaTeX, upload images, and
              manage your MongoDB posts from one clean editor.
            </p>
          </div>

          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={14} />
            Back to blog
          </Link>
        </div>

        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-8">
            <div className="mx-auto w-full max-w-4xl">
              <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-bg-muted)]/90 shadow-[0_20px_80px_rgba(0,0,0,0.22)] transition-all duration-300">
                <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                        {currentPost ? 'Editing post' : 'New post'}
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Keep the metadata compact, then focus on the writing area below.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetComposer}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      <SiteIcon name="add" alt="" className="h-4 w-4" />
                      New post
                    </button>
                  </div>
                </div>

                <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-8">
                  <button
                    type="button"
                    onClick={() => setIsMetadataOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-4 py-3 text-left transition-all duration-200 hover:border-[var(--color-accent)]/60"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        Post details
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        Title, slug, tags, cover image, and publication status.
                      </p>
                    </div>
                    {isMetadataOpen ? (
                      <ChevronUp size={16} className="text-[var(--color-text-secondary)]" />
                    ) : (
                      <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
                    )}
                  </button>

                  <div
                    className={`grid overflow-hidden transition-all duration-300 ${
                      isMetadataOpen ? 'mt-5 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="min-h-0">
                      <div className="space-y-5 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-bg)]/60 p-4 sm:p-5">
                        <div className="space-y-3">
                          <input
                            value={form.title}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                            placeholder="Post title..."
                            className="w-full border-0 bg-transparent px-0 py-0 text-3xl font-semibold text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)] sm:text-4xl"
                            style={{ fontFamily: 'var(--font-serif)' }}
                          />
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/70 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                              Slug preview
                            </p>
                            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                              <p className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-secondary)]">
                                mostafaabdelouahab.me/blog/{slugPreview}
                              </p>
                              <input
                                value={form.slug}
                                onChange={(event) => {
                                  setSlugTouched(true);
                                  setForm((current) => ({
                                    ...current,
                                    slug: slugify(event.target.value),
                                  }));
                                }}
                                placeholder="your-slug-here"
                                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none transition-all focus:border-[var(--color-accent)] sm:max-w-xs"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                              Category
                            </label>
                            <input
                              value={form.category}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  category: event.target.value,
                                }))
                              }
                              placeholder="Mathematics"
                              className={inputClasses}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                              Tags
                            </label>
                            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3">
                              <div className="mb-3 flex flex-wrap gap-2">
                                {form.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-medium text-[var(--color-accent)]"
                                  >
                                    {tag}
                                    <button
                                      type="button"
                                      onClick={() => removeTag(tag)}
                                      className="text-[var(--color-accent)]/80 transition hover:text-[var(--color-accent)]"
                                      aria-label={`Remove ${tag}`}
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <input
                                value={tagInput}
                                onChange={(event) => setTagInput(event.target.value)}
                                onKeyDown={handleTagKeyDown}
                                onBlur={() => addTag(tagInput)}
                                placeholder="Type a tag and press Enter"
                                className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-tertiary)]"
                              />
                            </div>
                          </div>

                          <div className="space-y-2 lg:col-span-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                              Excerpt
                            </label>
                            <textarea
                              value={form.excerpt}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  excerpt: event.target.value,
                                }))
                              }
                              rows={2}
                              placeholder="Short summary for the blog listing."
                              className={`${inputClasses} resize-none`}
                            />
                          </div>

                          <div className="space-y-2 lg:col-span-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                              Cover image
                            </label>
                            <div className="flex flex-col gap-3 sm:flex-row">
                              <input
                                value={form.coverImageUrl}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    coverImageUrl: event.target.value,
                                  }))
                                }
                                placeholder="https://..."
                                className={inputClasses}
                              />
                              <input
                                ref={coverUploadInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) {
                                    void handleCoverUpload(file);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => coverUploadInputRef.current?.click()}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                              >
                                <Upload size={14} />
                                Upload cover
                              </button>
                            </div>
                            {coverUploadFile ? (
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                Uploading {coverUploadFile.name}...
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/70 px-4 py-4">
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text)]">
                              Published status
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                              Toggle the default status for this post while editing.
                            </p>
                          </div>
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
                                form.isPublished ? 'left-9' : 'left-1 bg-[var(--color-text-secondary)]'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-5 sm:px-8 sm:py-6">
                  <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-all duration-200 focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_4px_rgba(79,152,163,0.10)]">
                    <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 p-1">
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
                            onClick={() => insertHeading(3)}
                            className={toolbarButtonClasses}
                            title="Heading 3"
                          >
                            <Heading3 size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertHeading(4)}
                            className={toolbarButtonClasses}
                            title="Heading 4"
                          >
                            <Heading4 size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertSnippet('**', '**', 'important idea')}
                            className={toolbarButtonClasses}
                            title="Bold (Ctrl+B)"
                          >
                            <Bold size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertSnippet('*', '*', 'emphasis')}
                            className={toolbarButtonClasses}
                            title="Italic (Ctrl+I)"
                          >
                            <Italic size={iconSize} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 p-1">
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertSnippet('`', '`', 'inline code')}
                            className={toolbarButtonClasses}
                            title="Inline code (Ctrl+K)"
                          >
                            <Code2 size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertSnippet('$', '$', 'f(x)=x^2')}
                            className={toolbarButtonClasses}
                            title="Inline math (Ctrl+M)"
                          >
                            <Sigma size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() =>
                              insertSnippet('\n$$\n', '\n$$\n', '\\int_0^1 x^2\\,dx = \\frac13')
                            }
                            className={toolbarButtonClasses}
                            title="Block math (Ctrl+Shift+M)"
                          >
                            <div className="flex items-center gap-0.5 text-[11px] font-semibold">
                              <Sigma size={12} />
                              <span>□</span>
                            </div>
                          </button>
                        </div>

                        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 p-1">
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => insertSnippet('[', '](https://example.com)', 'link text')}
                            className={toolbarButtonClasses}
                            title="Insert link (Ctrl+L)"
                          >
                            <Link2 size={iconSize} />
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
                            </button>

                            {isImagePopoverOpen ? (
                              <div
                                ref={imagePopoverRef}
                                className="absolute left-0 top-10 z-20 w-[min(92vw,20rem)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
                              >
                                <div className="mb-3 flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-1">
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
                                        className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[#0f0e0d]"
                                      >
                                        Insert image
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <input
                                        ref={imageUploadInputRef}
                                        type="file"
                                        accept="image/*"
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
                                        className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center text-sm transition-all ${
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
                                        className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[#0f0e0d] disabled:cursor-not-allowed disabled:opacity-60"
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

                        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 p-1">
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => prefixSelectedLines('1. ', 'List item')}
                            className={toolbarButtonClasses}
                            title="Ordered list"
                          >
                            <ListOrdered size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => prefixSelectedLines('- ', 'List item')}
                            className={toolbarButtonClasses}
                            title="Unordered list"
                          >
                            <List size={iconSize} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleToolbarMouseDown}
                            onClick={() => prefixSelectedLines('> ', 'Quoted text')}
                            className={toolbarButtonClasses}
                            title="Blockquote"
                          >
                            <Quote size={iconSize} />
                          </button>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 p-1">
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

                          <div className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
                            <button
                              type="button"
                              onClick={() => setMode('write')}
                              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
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
                              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
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

                    <div className="relative min-h-[540px]">
                      {mode === 'write' ? (
                        <textarea
                          ref={editorRef}
                          value={form.content}
                          onChange={handleEditorChange}
                          onKeyDown={handleEditorKeyDown}
                          placeholder="Write your post in Markdown. Use $...$ for inline math and $$...$$ for display math."
                          className="min-h-[540px] w-full resize-y border-0 bg-transparent px-5 py-5 font-mono text-sm leading-7 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)] sm:px-6 sm:py-6"
                          style={{
                            fontFamily:
                              '"JetBrains Mono", "Fira Code", Consolas, monospace',
                          }}
                        />
                      ) : (
                        <div className="min-h-[540px] px-5 py-5 sm:px-6 sm:py-6">
                          {isPreviewLoading ? (
                            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-4 py-6 text-sm text-[var(--color-text-secondary)]">
                              Rendering preview...
                            </div>
                          ) : (
                            <div
                              className="prose-academic max-w-none"
                              style={{ fontFamily: 'var(--font-serif)' }}
                              dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="sticky bottom-0 flex flex-col gap-4 border-t border-[var(--color-border)] bg-[var(--color-bg-muted)]/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {wordCount} words · {characterCount} characters · {autosaveLabel}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => void persistPost(false)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <SiteIcon name="document" alt="" className="h-4 w-4" />
                          Save draft
                        </button>
                        <button
                          type="button"
                          onClick={() => void persistPost(true)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[#0f0e0d] transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <SiteIcon name="document" alt="" className="h-4 w-4" />
                          {isSaving ? 'Saving...' : 'Publish post'}
                        </button>
                        {currentPost ? (
                          <button
                            type="button"
                            onClick={() => setPendingDeletePost(currentPost)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-3 text-sm font-medium text-red-300 transition-all duration-150 hover:border-red-400/60 hover:bg-red-500/10"
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

            <div className="mx-auto w-full max-w-4xl rounded-[28px] border border-[var(--color-border)] bg-[var(--color-bg-muted)]/90 shadow-[0_20px_80px_rgba(0,0,0,0.18)]">
              <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-8">
                <button
                  type="button"
                  onClick={() => setArePostsOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <div>
                    <h2
                      className="text-2xl font-semibold"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      Existing Posts ({posts.length})
                    </h2>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      Search, reopen, and manage your published posts and drafts.
                    </p>
                  </div>
                  {arePostsOpen ? (
                    <ChevronUp size={18} className="text-[var(--color-text-secondary)]" />
                  ) : (
                    <ChevronDown size={18} className="text-[var(--color-text-secondary)]" />
                  )}
                </button>
              </div>

              <div
                className={`grid overflow-hidden transition-all duration-300 ${
                  arePostsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0">
                  <div className="space-y-5 px-5 py-5 sm:px-8 sm:py-6">
                    <div className="relative">
                      <SiteIcon
                        name="search"
                        alt=""
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-65"
                      />
                      <input
                        value={postSearch}
                        onChange={(event) => setPostSearch(event.target.value)}
                        placeholder="Search posts, categories, or tags"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-[var(--color-accent)]"
                      />
                    </div>

                    {isLoadingPosts ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div
                            key={index}
                            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 animate-pulse"
                          >
                            <div className="mb-3 h-4 w-2/3 rounded bg-[var(--color-bg-elevated)]" />
                            <div className="h-3 w-1/2 rounded bg-[var(--color-bg-elevated)]" />
                          </div>
                        ))}
                      </div>
                    ) : filteredPosts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
                        No posts matched your search.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredPosts.map((post) => (
                          <div
                            key={post.id}
                            className={`rounded-2xl border px-4 py-4 transition-all duration-150 ${
                              selectedPostId === post.id
                                ? 'border-[var(--color-accent)] bg-[var(--color-bg)] shadow-[0_0_0_3px_rgba(79,152,163,0.10)]'
                                : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]/50'
                            }`}
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <button
                                type="button"
                                onClick={() => applySelectedPost(post)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <SiteIcon name="edit" alt="" className="float-left mr-3 mt-1 h-4 w-4" />
                                <p className="truncate text-lg font-semibold text-[var(--color-text)]">
                                  {post.title}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                  <span
                                    className={`rounded-full px-2.5 py-1 font-medium ${
                                      post.isPublished
                                        ? 'bg-emerald-500/15 text-emerald-300'
                                        : 'bg-amber-500/15 text-amber-300'
                                    }`}
                                  >
                                    {post.isPublished ? 'Published' : 'Draft'}
                                  </span>
                                  <span className="rounded-full bg-[var(--color-bg-elevated)] px-2.5 py-1 text-[var(--color-text-secondary)]">
                                    {post.category}
                                  </span>
                                  <span className="text-[var(--color-text-tertiary)]">
                                    {formatDate(post.updatedAt || post.createdAt)}
                                  </span>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setPendingDeletePost(post)}
                                className="inline-flex items-center justify-center rounded-xl border border-red-500/30 p-3 text-red-300 transition-all duration-150 hover:border-red-400/60 hover:bg-red-500/10"
                                title="Delete post"
                              >
                                <SiteIcon name="delete" alt="" className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
