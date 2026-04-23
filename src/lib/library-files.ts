import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const LOCAL_LIBRARY_UPLOAD_PREFIX = '/uploads/library/';
const LOCAL_LIBRARY_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  'public',
  'uploads',
  'library',
);
export const MAX_LIBRARY_FILE_BYTES = 100 * 1024 * 1024;

const ALLOWED_LIBRARY_EXTENSIONS = new Set([
  '.pdf',
  '.epub',
  '.djvu',
  '.mobi',
  '.azw',
  '.azw3',
  '.txt',
  '.doc',
  '.docx',
]);

const ALLOWED_LIBRARY_MIME_TYPES = new Set([
  'application/pdf',
  'application/epub+zip',
  'application/octet-stream',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/vnd.djvu',
]);

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getAllowedLibraryFileAcceptAttribute(): string {
  return Array.from(ALLOWED_LIBRARY_EXTENSIONS).join(',');
}

export function validateLibraryFile(file: File): string | null {
  const extension = path.extname(file.name || '').toLowerCase();

  if (file.size > MAX_LIBRARY_FILE_BYTES) {
    return 'Book files must be 100 MB or smaller.';
  }

  if (!ALLOWED_LIBRARY_EXTENSIONS.has(extension)) {
    return 'Allowed book formats: PDF, EPUB, DJVU, MOBI, AZW, AZW3, TXT, DOC, and DOCX.';
  }

  if (file.type && !ALLOWED_LIBRARY_MIME_TYPES.has(file.type)) {
    return 'This file type is not allowed for library uploads.';
  }

  return null;
}

export function normalizeFileUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Download link must be a valid URL.');
  }

  if (!HTTP_PROTOCOLS.has(url.protocol)) {
    throw new Error('Download link must start with http:// or https://.');
  }

  return url.toString();
}

export function getFileNameFromUrl(value: string): string {
  try {
    const url = new URL(value);
    const segments = url.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    if (!lastSegment) {
      return url.hostname;
    }

    return decodeURIComponent(lastSegment);
  } catch {
    return '';
  }
}

export function isVercelBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.hostname === 'blob.vercel-storage.com' ||
      url.hostname.endsWith('.blob.vercel-storage.com') ||
      url.hostname.endsWith('.public.blob.vercel-storage.com')
    );
  } catch {
    return false;
  }
}

export function isLocalLibraryUploadPath(value: string): boolean {
  return value.startsWith(LOCAL_LIBRARY_UPLOAD_PREFIX);
}

function resolveLocalLibraryUploadAbsolutePath(value: string): string {
  const normalizedPath = value.replace(/^\/+/, '');
  const resolvedPath = path.resolve(process.cwd(), 'public', normalizedPath);
  const allowedRoot = path.resolve(LOCAL_LIBRARY_UPLOAD_DIRECTORY);

  if (
    resolvedPath !== allowedRoot &&
    !resolvedPath.startsWith(`${allowedRoot}${path.sep}`)
  ) {
    throw new Error('Local library upload path is invalid.');
  }

  return resolvedPath;
}

export async function saveLocalLibraryFile(file: File): Promise<{
  fileName: string;
  filePath: string;
  fileSize: number;
}> {
  const originalName = file.name || 'book-file';
  const extension = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, extension) || 'book-file';
  const storedName = `${sanitizeFileName(baseName)}-${randomUUID()}${extension}`;
  const absolutePath = path.join(LOCAL_LIBRARY_UPLOAD_DIRECTORY, storedName);

  await mkdir(LOCAL_LIBRARY_UPLOAD_DIRECTORY, { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    fileName: originalName,
    filePath: `${LOCAL_LIBRARY_UPLOAD_PREFIX}${storedName}`,
    fileSize: file.size,
  };
}

export async function deleteStoredLibraryFile(value: string): Promise<void> {
  if (!isLocalLibraryUploadPath(value)) {
    return;
  }

  try {
    await unlink(resolveLocalLibraryUploadAbsolutePath(value));
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    if (errorCode !== 'ENOENT') {
      throw error;
    }
  }
}
