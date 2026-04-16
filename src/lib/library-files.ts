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

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
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
