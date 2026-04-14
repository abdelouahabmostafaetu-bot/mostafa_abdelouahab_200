const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

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
