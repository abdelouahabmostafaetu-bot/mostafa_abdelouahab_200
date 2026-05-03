'use client';

import Link from 'next/link';
import {
  type ChangeEvent,
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
import { slugify } from '@/lib/utils';
import type { CoffeeProblem, CoffeeProblemLevel } from '@/types/coffee-problem';

type ProblemFormState = {
  title: string;
  slug: string;
  shortDescription: string;
  level: CoffeeProblemLevel;
  difficulty: string;
  estimatedTime: string;
  tags: string;
  coverImage: string;
  fullProblemContent: string;
  solutionContent: string;
  isPublished: boolean;
};

type PreviewMode = 'write' | 'preview';
type ToastType = 'success' | 'error' | 'info';
type ImageTab = 'url' | 'upload';
type EditorField = 'fullProblemContent' | 'solutionContent';

type ToastMessage = {
  id: number;
  type: ToastType;
  message: string;
};

const PROBLEM_IMAGE_ACCEPT = 'image/png,image/jpeg,image/jpg';
const PROBLEM_IMAGE_MAX_SIZE = 4 * 1024 * 1024;
const PROBLEM_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

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

function validateProblemImageFile(file: File): string | null {
  if (!PROBLEM_IMAGE_TYPES.has(file.type)) {
    return 'Only PNG, JPG, and JPEG images are allowed.';
  }

  if (file.size > PROBLEM_IMAGE_MAX_SIZE) {
    return 'Images must be smaller than 4 MB.';
  }

  return null;
}

function createImageMarkdown(url: string, altText: string) {
  return `![${altText.trim() || 'Problem image'}](${url})`;
}

const initialFormState: ProblemFormState = {
  title: '',
  slug: '',
  shortDescription: '',
  level: 'beginner',
  difficulty: 'beginner',
  estimatedTime: '10 min',
  tags: '',
  coverImage: '',
  fullProblemContent: '',
  solutionContent: '',
  isPublished: false,
};

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

function toForm(problem?: CoffeeProblem | null): ProblemFormState {
  if (!problem) return initialFormState;

  return {
    title: problem.title,
    slug: problem.slug,
    shortDescription: problem.shortDescription,
    level: problem.level,
    difficulty: problem.difficulty,
    estimatedTime: problem.estimatedTime,
    tags: problem.tags.join(', '),
    coverImage: problem.coverImage,
    fullProblemContent: problem.fullProblemContent || '',
    solutionContent: problem.solutionContent || '',
    isPublished: problem.isPublished,
  };
}

export default function CoffeeProblemFormClient({
  initialProblem = null,
}: {
  initialProblem?: CoffeeProblem | null;
}) {
  const isEditing = Boolean(initialProblem);
  const problemContentEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const solutionEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const imagePopoverRef = useRef<HTMLDivElement | null>(null);

  const problemHistoryRef = useRef<string[]>([initialFormState.fullProblemContent]);
  const problemHistoryIndexRef = useRef(0);
  const solutionHistoryRef = useRef<string[]>([initialFormState.solutionContent]);
  const solutionHistoryIndexRef = useRef(0);
  const toastIdRef = useRef(0);

  const [form, setForm] = useState<ProblemFormState>(() => toForm(initialProblem));
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProblem));

  const [problemMode, setProblemMode] = useState<PreviewMode>('write');
  const [solutionMode, setSolutionMode] = useState<PreviewMode>('write');
  const [problemPreviewHtml, setProblemPreviewHtml] = useState('');
  const [solutionPreviewHtml, setSolutionPreviewHtml] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isProblemPreviewLoading, setIsProblemPreviewLoading] = useState(false);
  const [isSolutionPreviewLoading, setIsSolutionPreviewLoading] = useState(false);

  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [imageTab, setImageTab] = useState<ImageTab>('url');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('Problem image');
  const [imageUploadFile, setImageUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeEditorField, setActiveEditorField] = useState<EditorField>('fullProblemContent');

  const [problemHistoryControls, setProblemHistoryControls] = useState({
    canUndo: false,
    canRedo: false,
  });

  const [solutionHistoryControls, setSolutionHistoryControls] = useState({
    canUndo: false,
    canRedo: false,
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const inputClasses =
    'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all duration-150 placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15';

  useEffect(() => {
    if (slugTouched) return;
    setForm((current) => ({ ...current, slug: slugify(current.title) }));
  }, [form.title, slugTouched]);

  // History management helpers
  const syncProblemHistoryControls = () => {
    setProblemHistoryControls({
      canUndo: problemHistoryIndexRef.current > 0,
      canRedo: problemHistoryIndexRef.current < problemHistoryRef.current.length - 1,
    });
  };

  const syncSolutionHistoryControls = () => {
    setSolutionHistoryControls({
      canUndo: solutionHistoryIndexRef.current > 0,
      canRedo: solutionHistoryIndexRef.current < solutionHistoryRef.current.length - 1,
    });
  };

  const pushProblemHistory = (content: string) => {
    const nextHistory = problemHistoryRef.current.slice(0, problemHistoryIndexRef.current + 1);
    if (nextHistory[nextHistory.length - 1] === content) {
      return;
    }

    nextHistory.push(content);
    problemHistoryRef.current = nextHistory.slice(-150);
    problemHistoryIndexRef.current = problemHistoryRef.current.length - 1;
    syncProblemHistoryControls();
  };

  const pushSolutionHistory = (content: string) => {
    const nextHistory = solutionHistoryRef.current.slice(0, solutionHistoryIndexRef.current + 1);
    if (nextHistory[nextHistory.length - 1] === content) {
      return;
    }

    nextHistory.push(content);
    solutionHistoryRef.current = nextHistory.slice(-150);
    solutionHistoryIndexRef.current = solutionHistoryRef.current.length - 1;
    syncSolutionHistoryControls();
  };

  const resetProblemHistory = (content: string) => {
    problemHistoryRef.current = [content];
    problemHistoryIndexRef.current = 0;
    syncProblemHistoryControls();
  };

  const resetSolutionHistory = (content: string) => {
    solutionHistoryRef.current = [content];
    solutionHistoryIndexRef.current = 0;
    syncSolutionHistoryControls();
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
    field: EditorField,
    nextContent: string,
    selectionStart?: number,
    selectionEnd?: number,
    pushToHistory = true,
  ) => {
    setForm((current) => ({ ...current, [field]: nextContent }));
    if (field === 'fullProblemContent') {
      if (pushToHistory) {
        pushProblemHistory(nextContent);
      }
      setProblemMode('write');

      window.requestAnimationFrame(() => {
        const textarea = problemContentEditorRef.current;
        if (!textarea) {
          return;
        }

        textarea.focus();
        if (typeof selectionStart === 'number') {
          textarea.setSelectionRange(selectionStart, selectionEnd ?? selectionStart);
        }
      });
    } else {
      if (pushToHistory) {
        pushSolutionHistory(nextContent);
      }
      setSolutionMode('write');

      window.requestAnimationFrame(() => {
        const textarea = solutionEditorRef.current;
        if (!textarea) {
          return;
        }

        textarea.focus();
        if (typeof selectionStart === 'number') {
          textarea.setSelectionRange(selectionStart, selectionEnd ?? selectionStart);
        }
      });
    }
  };

  const insertSnippet = (
    field: EditorField,
    before: string,
    after = '',
    fallback = '',
  ) => {
    const textarea = field === 'fullProblemContent' ? problemContentEditorRef.current : solutionEditorRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = form[field];
    const selectedText = currentContent.slice(start, end) || fallback;
    const nextContent =
      currentContent.slice(0, start) +
      before +
      selectedText +
      after +
      currentContent.slice(end);

    const selectionStart = start + before.length;
    const selectionEnd = selectionStart + selectedText.length;
    applyEditorContent(field, nextContent, selectionStart, selectionEnd);
  };

  const prefixSelectedLines = (field: EditorField, prefix: string, fallback: string) => {
    const textarea = field === 'fullProblemContent' ? problemContentEditorRef.current : solutionEditorRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = form[field];
    const selectedText = currentContent.slice(start, end) || fallback;
    const transformed = selectedText
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');

    const nextContent =
      currentContent.slice(0, start) + transformed + currentContent.slice(end);
    applyEditorContent(field, nextContent, start, start + transformed.length);
  };

  const insertBlock = (field: EditorField, value: string, selectOffset = 0) => {
    const textarea = field === 'fullProblemContent' ? problemContentEditorRef.current : solutionEditorRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = form[field];
    const nextContent =
      currentContent.slice(0, start) + value + currentContent.slice(end);
    const nextSelection = start + value.length - selectOffset;
    applyEditorContent(field, nextContent, nextSelection, nextSelection);
  };

  const insertHeading = (field: EditorField, level: 2 | 3 | 4) => {
    const fallback = level === 2 ? 'Section title' : level === 3 ? 'Subsection title' : 'Detail heading';
    insertSnippet(field, `${'#'.repeat(level)} `, '', fallback);
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
    const field = activeEditorField;
    const textarea = field === 'fullProblemContent' ? problemContentEditorRef.current : solutionEditorRef.current;
    if (!textarea) {
      const currentContent = form[field];
      applyEditorContent(field, `${currentContent}${markdown}`);
    } else {
      insertBlock(field, markdown);
    }
    setImageUrlInput('');
    setImageAltInput('Problem image');
    setImageUploadFile(null);
    setIsImagePopoverOpen(false);
  };

  const handleEditorChange = (
    field: EditorField,
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const nextContent = event.target.value;
    setForm((current) => ({ ...current, [field]: nextContent }));
    if (field === 'fullProblemContent') {
      pushProblemHistory(nextContent);
    } else {
      pushSolutionHistory(nextContent);
    }
  };

  const handleProblemUndo = () => {
    if (problemHistoryIndexRef.current <= 0) {
      return;
    }

    problemHistoryIndexRef.current -= 1;
    const nextContent = problemHistoryRef.current[problemHistoryIndexRef.current] ?? '';
    setForm((current) => ({ ...current, fullProblemContent: nextContent }));
    setProblemMode('write');
    syncProblemHistoryControls();
  };

  const handleProblemRedo = () => {
    if (problemHistoryIndexRef.current >= problemHistoryRef.current.length - 1) {
      return;
    }

    problemHistoryIndexRef.current += 1;
    const nextContent = problemHistoryRef.current[problemHistoryIndexRef.current] ?? '';
    setForm((current) => ({ ...current, fullProblemContent: nextContent }));
    setProblemMode('write');
    syncProblemHistoryControls();
  };

  const handleSolutionUndo = () => {
    if (solutionHistoryIndexRef.current <= 0) {
      return;
    }

    solutionHistoryIndexRef.current -= 1;
    const nextContent = solutionHistoryRef.current[solutionHistoryIndexRef.current] ?? '';
    setForm((current) => ({ ...current, solutionContent: nextContent }));
    setSolutionMode('write');
    syncSolutionHistoryControls();
  };

  const handleSolutionRedo = () => {
    if (solutionHistoryIndexRef.current >= solutionHistoryRef.current.length - 1) {
      return;
    }

    solutionHistoryIndexRef.current += 1;
    const nextContent = solutionHistoryRef.current[solutionHistoryIndexRef.current] ?? '';
    setForm((current) => ({ ...current, solutionContent: nextContent }));
    setSolutionMode('write');
    syncSolutionHistoryControls();
  };

  const toggleProblemPreview = async () => {
    if (problemMode === 'preview') {
      setProblemMode('write');
      return;
    }

    setIsProblemPreviewLoading(true);
    setErrorMessage('');
    try {
      const html = await requestPreviewHtml(form.fullProblemContent);
      setProblemPreviewHtml(html);
      setProblemMode('preview');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to render preview.');
    } finally {
      setIsProblemPreviewLoading(false);
    }
  };

  const toggleSolutionPreview = async () => {
    if (solutionMode === 'preview') {
      setSolutionMode('write');
      return;
    }

    setIsSolutionPreviewLoading(true);
    setErrorMessage('');
    try {
      const html = await requestPreviewHtml(form.solutionContent);
      setSolutionPreviewHtml(html);
      setSolutionMode('preview');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to render preview.');
    } finally {
      setIsSolutionPreviewLoading(false);
    }
  };

  const handleInlineImageUpload = async () => {
    if (!imageUploadFile) {
      showToast('error', 'Choose an image first.');
      return;
    }

    const validationError = validateProblemImageFile(imageUploadFile);
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    setIsUploadingImage(true);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/problems-with-coffee/upload-image');

        xhr.upload.addEventListener('progress', (event) => {
          if (!event.lengthComputable) return;
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const payload = parseUploadResponse(xhr.responseText);
            if (payload.markdown) {
              insertImageMarkdown(payload.markdown, imageAltInput);
              resolve();
              return;
            }
          }
          reject(new Error('Failed to upload image.'));
        });

        xhr.addEventListener('error', () => reject(new Error('Failed to upload image.')));
        xhr.send(imageUploadFile);
      });

      setImageUploadFile(null);
      setUploadProgress(0);
      showToast('success', 'Image uploaded and inserted.');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to upload image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!form.title.trim()) {
      setErrorMessage('Please enter a title.');
      showToast('error', 'Please enter a title.');
      return;
    }

    if (!form.slug.trim()) {
      setErrorMessage('Please enter a slug.');
      showToast('error', 'Please enter a slug.');
      return;
    }

    if (!form.fullProblemContent.trim()) {
      setErrorMessage('Please enter the problem content.');
      showToast('error', 'Please enter the problem content.');
      return;
    }

    if (!form.solutionContent.trim()) {
      setErrorMessage('Please enter the solution content.');
      showToast('error', 'Please enter the solution content.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const endpoint = isEditing
        ? `/api/problems-with-coffee/${initialProblem?.slug}`
        : '/api/problems-with-coffee';

      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          shortDescription: form.shortDescription,
          level: form.level,
          difficulty: form.difficulty,
          estimatedTime: form.estimatedTime,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t),
          coverImage: form.coverImage,
          fullProblemContent: form.fullProblemContent,
          solutionContent: form.solutionContent,
          isPublished: publish,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { slug?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save problem.');
      }

      setForm({
        ...form,
        isPublished: publish,
      });

      showToast(
        'success',
        publish
          ? 'Problem published successfully.'
          : 'Problem draft saved successfully.',
      );

      if (!isEditing) {
        setForm(initialFormState);
        setSlugTouched(false);
        setProblemPreviewHtml('');
        setSolutionPreviewHtml('');
        resetProblemHistory(initialFormState.fullProblemContent);
        resetSolutionHistory(initialFormState.solutionContent);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save problem.';
      setErrorMessage(message);
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const toolbarButtons = (field: EditorField) => (
    <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2">
      <button
        type="button"
        onClick={() => insertSnippet(field, '**', '**', 'bold text')}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => insertSnippet(field, '*', '*', 'italic text')}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        onClick={() => insertSnippet(field, '[', '](url)', 'link text')}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
        title="Link"
      >
        <Link2 size={16} />
      </button>
      <button
        type="button"
        onClick={() => insertSnippet(field, '`', '`', 'code')}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
        title="Inline Code"
      >
        <Code2 size={16} />
      </button>
      <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
      <button
        type="button"
        onClick={() => insertHeading(field, 2)}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
        title="Heading 2"
      >
        <Heading2 size={16} />
      </button>
      <button
        type="button"
        onClick={() => prefixSelectedLines(field, '- ', 'List item')}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => prefixSelectedLines(field, '1. ', 'List item')}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>
      <button
        type="button"
        onClick={() => insertBlock(field, '\n> ', 0)}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
        title="Quote"
      >
        <Quote size={16} />
      </button>
      <button
        type="button"
        onClick={() => insertBlock(field, '\n---\n', 0)}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
        title="Horizontal Rule"
      >
        <Minus size={16} />
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setActiveEditorField(field);
            setIsImagePopoverOpen(!isImagePopoverOpen);
          }}
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
                  accept={PROBLEM_IMAGE_ACCEPT}
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
  );

  return (
    <section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">
            {isEditing ? 'Edit Problem' : 'Add Problem'}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Create a problem with rich text editing and math notation support.
          </p>
          <Link
            href="/admin/problems-with-coffee"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Back to admin dashboard
          </Link>
        </div>

        <div className="space-y-6">
          {/* Basic Fields */}
          <label htmlFor="problem-title" className="block text-sm text-[var(--color-text-secondary)]">
            <span className="mb-1 block uppercase tracking-wide">Title</span>
            <input
              id="problem-title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Problem title"
              required
              className={inputClasses}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="problem-slug" className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Slug</span>
              <input
                id="problem-slug"
                value={form.slug}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, slug: e.target.value }));
                  setSlugTouched(true);
                }}
                placeholder="problem-slug"
                required
                className={inputClasses}
              />
            </label>

            <label htmlFor="problem-level" className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Level</span>
              <select
                id="problem-level"
                value={form.level}
                onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value as CoffeeProblemLevel }))}
                className={inputClasses}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>

          <label htmlFor="problem-description" className="block text-sm text-[var(--color-text-secondary)]">
            <span className="mb-1 block uppercase tracking-wide">Short Description</span>
            <textarea
              id="problem-description"
              value={form.shortDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
              placeholder="Brief description of the problem"
              rows={2}
              className={`${inputClasses} resize-none`}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label htmlFor="problem-difficulty" className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Difficulty</span>
              <input
                id="problem-difficulty"
                value={form.difficulty}
                onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                placeholder="Beginner"
                className={inputClasses}
              />
            </label>

            <label htmlFor="problem-time" className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Estimated Time</span>
              <input
                id="problem-time"
                value={form.estimatedTime}
                onChange={(e) => setForm((prev) => ({ ...prev, estimatedTime: e.target.value }))}
                placeholder="10 min"
                className={inputClasses}
              />
            </label>

            <label htmlFor="problem-tags" className="block text-sm text-[var(--color-text-secondary)]">
              <span className="mb-1 block uppercase tracking-wide">Tags</span>
              <input
                id="problem-tags"
                value={form.tags}
                onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="math, geometry, algebra"
                className={inputClasses}
              />
            </label>
          </div>

          <label htmlFor="problem-cover" className="block text-sm text-[var(--color-text-secondary)]">
            <span className="mb-1 block uppercase tracking-wide">Cover Image URL</span>
            <input
              id="problem-cover"
              value={form.coverImage}
              onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              className={inputClasses}
            />
          </label>

          {/* Full Problem Content Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                Full Problem Content
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleProblemUndo}
                  disabled={!problemHistoryControls.canUndo}
                  className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  title="Undo"
                >
                  <Undo2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleProblemRedo}
                  disabled={!problemHistoryControls.canRedo}
                  className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  title="Redo"
                >
                  <Redo2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={toggleProblemPreview}
                  disabled={isProblemPreviewLoading}
                  className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  title="Toggle Preview"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            {toolbarButtons('fullProblemContent')}

            {problemMode === 'write' ? (
              <textarea
                ref={problemContentEditorRef}
                value={form.fullProblemContent}
                onChange={(e) => handleEditorChange('fullProblemContent', e)}
                onFocus={() => setActiveEditorField('fullProblemContent')}
                onKeyDown={(e) => {
                  const hasModifier = e.ctrlKey || e.metaKey;
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    insertBlock('fullProblemContent', '  ');
                    return;
                  }
                  if (!hasModifier) return;
                  const key = e.key.toLowerCase();
                  if (key === 'b') {
                    e.preventDefault();
                    insertSnippet('fullProblemContent', '**', '**', 'bold text');
                  } else if (key === 'i') {
                    e.preventDefault();
                    insertSnippet('fullProblemContent', '*', '*', 'italic text');
                  } else if (key === 'k') {
                    e.preventDefault();
                    insertSnippet('fullProblemContent', '[', '](url)', 'link text');
                  }
                }}
                placeholder="Write your problem content here. Use Markdown and LaTeX (e.g., $x^2$ or $$\int_0^1 x dx$$)..."
                rows={20}
                className={`${inputClasses} font-mono text-sm resize-none rounded-t-none`}
              />
            ) : (
              <div
                className="problem-content min-h-[400px] rounded-b-md border border-t-0 border-[var(--color-border)] bg-[var(--color-bg)] p-4 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: problemPreviewHtml }}
              />
            )}
          </div>

          {/* Solution Content Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                Solution Content
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSolutionUndo}
                  disabled={!solutionHistoryControls.canUndo}
                  className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  title="Undo"
                >
                  <Undo2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleSolutionRedo}
                  disabled={!solutionHistoryControls.canRedo}
                  className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  title="Redo"
                >
                  <Redo2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={toggleSolutionPreview}
                  disabled={isSolutionPreviewLoading}
                  className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  title="Toggle Preview"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            {toolbarButtons('solutionContent')}

            {solutionMode === 'write' ? (
              <textarea
                ref={solutionEditorRef}
                value={form.solutionContent}
                onChange={(e) => handleEditorChange('solutionContent', e)}
                onFocus={() => setActiveEditorField('solutionContent')}
                onKeyDown={(e) => {
                  const hasModifier = e.ctrlKey || e.metaKey;
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    insertBlock('solutionContent', '  ');
                    return;
                  }
                  if (!hasModifier) return;
                  const key = e.key.toLowerCase();
                  if (key === 'b') {
                    e.preventDefault();
                    insertSnippet('solutionContent', '**', '**', 'bold text');
                  } else if (key === 'i') {
                    e.preventDefault();
                    insertSnippet('solutionContent', '*', '*', 'italic text');
                  } else if (key === 'k') {
                    e.preventDefault();
                    insertSnippet('solutionContent', '[', '](url)', 'link text');
                  }
                }}
                placeholder="Write your solution here. Use Markdown and LaTeX (e.g., $x^2$ or $$\int_0^1 x dx$$)..."
                rows={20}
                className={`${inputClasses} font-mono text-sm resize-none rounded-t-none`}
              />
            ) : (
              <div
                className="problem-content min-h-[400px] rounded-b-md border border-t-0 border-[var(--color-border)] bg-[var(--color-bg)] p-4 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: solutionPreviewHtml }}
              />
            )}
          </div>

          {/* Save Actions */}
          <div className="flex items-center justify-between gap-4">
            <div />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#0f0e0d] transition hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? 'Publishing...' : 'Publish'}
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
