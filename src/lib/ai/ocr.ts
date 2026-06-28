/**
 * Unlimited-OCR client.
 *
 * Sends an uploaded image to our Modal-hosted baidu/Unlimited-OCR endpoint and
 * returns the recognized text / LaTeX. Designed to NEVER throw: if anything
 * goes wrong (missing config, timeout, or a bad response) it returns an empty
 * string so the caller can simply fall back to normal vision handling.
 *
 * Configure two environment variables in Vercel:
 *   OCR_API_URL   -> the https .modal.run endpoint
 *   OCR_API_TOKEN -> the same password stored in the Modal secret OCR_TOKEN
 */
import type { ChatImage } from './providers';

const OCR_TIMEOUT_MS = 55_000;
const OCR_PROMPT = '<image>document parsing.';

export async function recognizeImage(image: ChatImage): Promise<string> {
  const url = process.env.OCR_API_URL;
  const token = process.env.OCR_API_TOKEN;
  if (!url || !token) return '';
  if (!image || !image.dataBase64) return '';

  const controller = new AbortController();
  const timer = setTimeout((): void => controller.abort(), OCR_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        image_base64: image.dataBase64,
        prompt: OCR_PROMPT,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return '';
    const data: unknown = await res.json();
    if (data && typeof data === 'object' && 'text' in data) {
      const value = (data as { text?: unknown }).text;
      return typeof value === 'string' ? value.trim() : '';
    }
    return '';
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}
