/**
 * Signed session tokens using Web Crypto (HMAC-SHA256).
 * Works in both the Edge runtime (middleware/proxy) and Node.js (API routes),
 * with zero external dependencies.
 *
 * Token format: base64url(JSON payload) + '.' + base64url(HMAC signature)
 */

export type SessionPayload = {
  /** Subject — the MongoDB user id (or a state nonce for OAuth). */
  sub: string;
  email: string;
  name: string;
  image: string;
  /** Expiry as a unix timestamp in seconds. */
  exp: number;
};

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createSessionToken(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes) return null;

  try {
    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as BufferSource,
      encoder.encode(body),
    );
    if (!valid) return null;

    const payloadBytes = fromBase64Url(body);
    if (!payloadBytes) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(payloadBytes),
    ) as SessionPayload;

    if (!payload || typeof payload.sub !== 'string') return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
