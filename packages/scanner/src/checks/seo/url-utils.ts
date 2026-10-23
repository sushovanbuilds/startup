/**
 * URL normalization helpers for SEO checks.
 */

/**
 * Returns the absolute URL string if `raw` resolves against `base` to an
 * absolute http(s) URL, otherwise null.
 */
export function normalizeUrlSafe(raw: string, base = 'https://check.invalid/'): string | null {
  try {
    const resolved = new URL(raw, base);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    return resolved.toString();
  } catch {
    return null;
  }
}
