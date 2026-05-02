import path from 'node:path';

export const MAX_BOOK_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_COVER_IMAGE_BYTES = 4 * 1024 * 1024;

export const ALLOWED_BOOK_FILE_TYPES = new Set(['application/pdf']);
export const ALLOWED_BOOK_FILE_EXTENSIONS = new Set(['.pdf']);

export const ALLOWED_COVER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
]);
export const ALLOWED_COVER_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
]);

export function sanitizeUploadFileName(value: string, fallback: string): string {
  const parsed = path.parse(value || fallback);
  const extension = parsed.ext.toLowerCase();
  const safeName = (parsed.name || fallback)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${safeName || fallback}${extension}`;
}

export function validateBookUploadFile(file: File): string | null {
  const extension = path.extname(file.name || '').toLowerCase();

  if (!ALLOWED_BOOK_FILE_TYPES.has(file.type) || !ALLOWED_BOOK_FILE_EXTENSIONS.has(extension)) {
    return 'Only PDF files are allowed.';
  }

  if (file.size > MAX_BOOK_FILE_BYTES) {
    return 'Book files must be smaller than 30 MB.';
  }

  return null;
}

export function validateCoverUploadFile(file: File): string | null {
  const extension = path.extname(file.name || '').toLowerCase();

  if (!ALLOWED_COVER_IMAGE_TYPES.has(file.type) || !ALLOWED_COVER_IMAGE_EXTENSIONS.has(extension)) {
    return 'Only PNG, JPG, and JPEG cover images are allowed.';
  }

  if (file.size > MAX_COVER_IMAGE_BYTES) {
    return 'Cover images must be smaller than 4 MB.';
  }

  return null;
}
