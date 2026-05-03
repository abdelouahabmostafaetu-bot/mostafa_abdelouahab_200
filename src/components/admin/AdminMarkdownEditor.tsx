'use client';

import {
  type ChangeEvent,
  type KeyboardEvent,
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

type PreviewMode = 'write' | 'preview';
type ToastType = 'success' | 'error' | 'info';
type ImageTab = 'url' | 'upload';

type ToastMessage = {
  id: number;
  type: ToastType;
  message: string;
};

type UploadResponse = {
  url?: string;
  markdown?: string;
  error?: string;
};

type AdminMarkdownEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  previewClassName?: string;
  imageAltText?: string;
  uploadEndpoint?: string;
};

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/jpg';
const IMAGE_MAX_SIZE = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

const inputClasses =
  'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-all duration-150 placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15';

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

function parseUploadResponse(responseText: string): UploadResponse {
  try {
    return JSON.parse(responseText || '{}') as UploadResponse;
  } catch {
    return { error: 'Failed to upload image.' };
  }
}

function validateImageFile(file: File): string | null {
  if (!IMAGE_TYPES.has(file.type)) {
    return 'Only PNG, JPG, and JPEG images are allowed.';
  }

  if (file.size > IMAGE_MAX_SIZE) {
    return 'Images must be smaller than 4 MB.';
  }

  return null;
}

function createImageMarkdown(url: string, altText: string) {
  return `![${altText.trim() || 'Image'}](${url})`;
}

export default function AdminMarkdownEditor({
  label,
  value,
  onChange,
  placeholder,
  previewClassName = 'blog-content problem-content',
  imageAltText = 'Problem image',
  uploadEndpoint,
}: AdminMarkdownEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<string[]>([value]);
  const historyIndexRef = useRef(0);
  const latestValueRef = useRef(value);
  const toastIdRef = useRef(0);

  const [mode, setMode] = useState<PreviewMode>('write');
  const [previewHtml, setPreviewHtml] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [imageTab, setImageTab] = useState<ImageTab>('url');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState(imageAltText);
  const [imageUploadFile, setImageUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [historyControls, setHistoryControls] = useState({
    canUndo: false,
    canRedo: false,
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const syncHistoryControls = () => {
    setHistoryControls({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1,
    });
  };

  useEffect(() => {
    if (latestValueRef.current === value) {
      return;
    }

    latestValueRef.current = value;
    setMode('write');
    setPreviewHtml('');
    historyRef.current = [value];
    historyIndexRef.current = 0;
    setHistoryControls({
      canUndo: false,
      canRedo: false,
    });
  }, [value]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = toastIdRef.current + 1;
    toastIdRef.current = id;
    setToasts((current) => [...current, { id, type, message }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
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

  const applyEditorContent = (
    nextContent: string,
    selectionStart?: number,
    selectionEnd?: number,
    pushToHistory = true,
  ) => {
    latestValueRef.current = nextContent;
    onChange(nextContent);
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
    const selectedText = value.slice(start, end) || fallback;
    const nextContent =
      value.slice(0, start) + before + selectedText + after + value.slice(end);

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
    const selectedText = value.slice(start, end) || fallback;
    const transformed = selectedText
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');

    const nextContent = value.slice(0, start) + transformed + value.slice(end);
    applyEditorContent(nextContent, start, start + transformed.length);
  };

  const insertBlock = (block: string, selectOffset = 0) => {
    const textarea = editorRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextContent = value.slice(0, start) + block + value.slice(end);
    const nextSelection = start + block.length - selectOffset;
    applyEditorContent(nextContent, nextSelection, nextSelection);
  };

  const insertHeading = (level: 2 | 3 | 4) => {
    const fallback =
      level === 2 ? 'Section title' : level === 3 ? 'Subsection title' : 'Detail heading';
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
    if (editorRef.current) {
      insertBlock(markdown);
    } else {
      applyEditorContent(`${value}${markdown}`);
    }

    setImageUrlInput('');
    setImageAltInput(imageAltText);
    setImageUploadFile(null);
    setIsImagePopoverOpen(false);
  };

  const handleEditorChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = event.target.value;
    latestValueRef.current = nextContent;
    onChange(nextContent);
    pushHistory(nextContent);
  };

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) {
      return;
    }

    historyIndexRef.current -= 1;
    const nextContent = historyRef.current[historyIndexRef.current] ?? '';
    latestValueRef.current = nextContent;
    onChange(nextContent);
    setMode('write');
    syncHistoryControls();
  };

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      return;
    }

    historyIndexRef.current += 1;
    const nextContent = historyRef.current[historyIndexRef.current] ?? '';
    latestValueRef.current = nextContent;
    onChange(nextContent);
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
      const html = await requestPreviewHtml(value);
      setPreviewHtml(html);
      setMode('preview');
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to render preview.',
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== 'preview') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsPreviewLoading(true);
      requestPreviewHtml(value)
        .then((html) => setPreviewHtml(html))
        .catch((error) =>
          showToast(
            'error',
            error instanceof Error ? error.message : 'Failed to render preview.',
          ),
        )
        .finally(() => setIsPreviewLoading(false));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [mode, showToast, value]);

  const uploadFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      if (!uploadEndpoint) {
        reject(new Error('Image uploads are not configured.'));
        return;
      }

      const requestBody = new FormData();
      requestBody.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadEndpoint);

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

    const validationError = validateImageFile(imageUploadFile);
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    setIsUploadingImage(true);
    setUploadProgress(0);

    try {
      const url = await uploadFile(imageUploadFile);
      insertImageMarkdown(url, imageAltInput);
      showToast('success', 'Image uploaded and inserted.');
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to upload image.',
      );
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
      if (imageUploadInputRef.current) {
        imageUploadInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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
      insertSnippet('**', '**', 'bold text');
    } else if (key === 'i') {
      event.preventDefault();
      insertSnippet('*', '*', 'italic text');
    } else if (key === 'k') {
      event.preventDefault();
      insertSnippet('[', '](url)', 'link text');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-[var(--color-border)] text-xs">
            <button
              type="button"
              onClick={() => setMode('write')}
              className={`px-3 py-1.5 ${
                mode === 'write'
                  ? 'bg-[var(--color-accent)] text-[#0f0e0d]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => {
                if (mode !== 'preview') void togglePreview();
              }}
              disabled={isPreviewLoading}
              className={`px-3 py-1.5 ${
                mode === 'preview'
                  ? 'bg-[var(--color-accent)] text-[#0f0e0d]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
              } disabled:opacity-50`}
            >
              Preview
            </button>
          </div>
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
        <button
          type="button"
          onClick={() => insertSnippet('$', '$', 'x^2+1')}
          className="rounded px-1.5 py-1 font-mono text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
          title="Inline Math"
        >
          $
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('$$\n', '\n$$', '\\int_0^1 f(x)\\,dx')}
          className="rounded px-1.5 py-1 font-mono text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
          title="Display Math"
        >
          $$
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
            <div className="fixed inset-x-3 top-28 z-50 max-h-[calc(100svh-8rem)] overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-lg sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-1 sm:w-80 sm:p-4">
              <div className="mb-3 flex gap-2 border-b border-[var(--color-border)] pb-2">
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`rounded px-3 py-1 text-sm ${
                    imageTab === 'url'
                      ? 'bg-[var(--color-accent)] text-[#0f0e0d]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                  }`}
                >
                  URL
                </button>
                {uploadEndpoint ? (
                  <button
                    type="button"
                    onClick={() => setImageTab('upload')}
                    className={`rounded px-3 py-1 text-sm ${
                      imageTab === 'upload'
                        ? 'bg-[var(--color-accent)] text-[#0f0e0d]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                    }`}
                  >
                    Upload
                  </button>
                ) : null}
              </div>

              {imageTab === 'url' || !uploadEndpoint ? (
                <div className="space-y-3">
                  <input
                    value={imageUrlInput}
                    onChange={(event) => setImageUrlInput(event.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className={inputClasses}
                  />
                  <input
                    value={imageAltInput}
                    onChange={(event) => setImageAltInput(event.target.value)}
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
                    accept={IMAGE_ACCEPT}
                    onChange={(event) => setImageUploadFile(event.target.files?.[0] ?? null)}
                    className="w-full text-sm text-[var(--color-text-secondary)] file:mr-4 file:rounded file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1 file:text-sm file:font-semibold file:text-[#0f0e0d]"
                  />
                  <input
                    value={imageAltInput}
                    onChange={(event) => setImageAltInput(event.target.value)}
                    placeholder="Describe the image"
                    className={inputClasses}
                  />
                  {uploadProgress > 0 ? (
                    <div className="h-2 w-full rounded-full bg-[var(--color-bg-secondary)]">
                      <div
                        className="h-2 rounded-full bg-[var(--color-accent)] transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  ) : null}
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
          value={value}
          onChange={handleEditorChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={20}
          className={`${inputClasses} resize-none rounded-t-none font-mono text-sm`}
        />
      ) : (
        <div
          className={`${previewClassName} min-h-[400px] max-w-none rounded-b-md border border-t-0 border-[var(--color-border)] bg-[var(--color-bg)] p-4 prose prose-sm`}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
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
  );
}
