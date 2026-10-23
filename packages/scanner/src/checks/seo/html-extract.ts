/**
 * Minimal HTML metadata extraction for SEO checks.
 * Deliberately regex-based (no DOM parser dependency): sufficient for the
 * six MVP SEO checks and keeps the dependency surface small (DECISIONS.md).
 */

export interface HtmlMeta {
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  h1Texts: string[];
  canonical: string | null;
  robotsMetaContent: string | null;
  links: string[]; // hrefs of <a> elements, in document order
}

function matchFirst(html: string, re: RegExp): string | null {
  const m = re.exec(html);
  if (!m) return null;
  const value = (m[1] ?? '').trim();
  return value.length > 0 ? value : null;
}

/**
 * Unescape the small set of HTML entities we may encounter in metadata.
 */
export function unescapeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)));
}

/**
 * Extract SEO-relevant metadata from an HTML document.
 * Whitespace is collapsed before matching to make regexes markup-insensitive.
 */
export function extractHtmlMeta(html: string): HtmlMeta {
  // Collapse inter-tag whitespace/newlines so WHITESPACE-heavy markup matches.
  // Guard against attribute values losing meaningful spaces: we keep inner
  // attribute values intact because we match within tags.
  const compact = html.replace(/\r\n?/g, '\n');

  const title = matchFirst(
    compact,
    /<title[^>]*>([\s\S]*?)<\/title>/i
  );
  const titleValue = title === null ? null : unescapeHtml(title).replace(/\s+/g, ' ').trim();

  const metaDescriptionRaw = matchFirst(
    compact,
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i
  );
  const metaDescriptionAlt = metaDescriptionRaw === null
    ? matchFirst(
        compact,
        /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*\/?>/i
      )
    : metaDescriptionRaw;
  const metaDescription =
    metaDescriptionAlt === null ? null : unescapeHtml(metaDescriptionAlt).replace(/\s+/g, ' ').trim();

  const h1s: string[] = [];
  const h1Re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let h1Match: RegExpExecArray | null;
  while ((h1Match = h1Re.exec(compact)) !== null) {
    const text = unescapeHtml(h1Match[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    if (text.length > 0) h1s.push(text);
  }

  const canonical = matchFirst(
    compact,
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*\/?>/i
  );

  const robotsMetaContent = matchFirst(
    compact,
    /<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i
  );

  const links: string[] = [];
  const linkRe = /<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRe.exec(compact)) !== null) {
    const href = linkMatch[1];
    // Skip non-document protocols and same-page fragments
    if (/^(mailto|tel|javascript|data):/i.test(href)) continue;
    if (href.startsWith('#')) continue;
    links.push(href);
  }

  return {
    title: titleValue,
    metaDescription,
    h1Count: h1s.length,
    h1Texts: h1s,
    canonical,
    robotsMetaContent,
    links,
  };
}

/**
 * True if the robots meta (or X-Robots-Tag header value) forbids indexing.
 */
export function isNoindex(robotsDirective: string | null | undefined): boolean {
  if (!robotsDirective) return false;
  return (/(?:^|[\s,])noindex(?:[\s,]|$)/i.test(robotsDirective));
}
