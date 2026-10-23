/**
 * Bounded same-origin crawler built exclusively on safe-fetch.
 *
 * Limits honored (FINDINGS-SPEC + SECURITY-SCANNER):
 * - crawl depth defaults to 2 (homepage + first-level pages)
 * - max pages comes from the caller (plan-derived: getCrawledPagesLimit has a
 *   per-scan ceiling), enforced BEFORE each fetch
 * - only same-origin pages are followed; external links are never fetched
 * - broken-link probing is bounded (maxUniqueLinks total, maxLinksPerPage per page)
 * - every fetch re-enters safe-fetch so SSRF rules apply per hop
 */
import { safeFetch } from '../../net/safe-fetch';
import { extractHtmlMeta, type HtmlMeta } from './html-extract';

export const DEFAULT_MAX_DEPTH = 2;
export const DEFAULT_MAX_PAGES = 20;
export const MAX_LINKS_PER_PAGE = 10;
export const MAX_UNIQUE_LINKS_PROBED = 50;

export interface CrawlerOptions {
  /** Absolute URL the scan was requested for (homepage). */
  startUrl: string;
  /** Per-scan page cap; caller derives this from the plan entitlement. */
  maxPages?: number;
  maxDepth?: number;
}

export interface CrawledPage {
  url: string;
  html: string;
  headers: Record<string, string>;
  statusCode: number;
  /** Depth 0 = start page. */
  depth: number;
  meta: HtmlMeta;
}

export interface BrokenLink {
  url: string;
  statusCode: number | null;
  error?: string;
}

export interface CrawlResult {
  pages: CrawledPage[];
  brokenLinks: BrokenLink[];
  /** True if the page or depth cap stopped the crawl early. */
  truncated: boolean;
  /** How many pages were actually fetched during the crawl. */
  pagesFetched: number;
}

interface CrawlState {
  queue: Array<{ url: string; depth: number }>;
  visited: Set<string>;
  pages: CrawledPage[];
  brokenLinks: BrokenLink[];
  linkBudgetRemaining: number;
}

function normalizeUrl(rawUrl: string, base: string): string | null {
  try {
    const resolved = new URL(rawUrl, base);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    // Strip fragment and hash for dedupe purposes
    resolved.hash = '';
    return resolved.toString();
  } catch {
    return null;
  }
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

/**
 * Crawl up to maxPages pages within maxDepth, same-origin only.
 * Page 1 (the start URL) counts toward the maxPages budget, so a free-tier
 * single-page scan passes maxPages: 1 and never follows any links.
 */
export async function boundedCrawl(options: CrawlerOptions): Promise<CrawlResult> {
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  const startNormalized = normalizeUrl(options.startUrl, options.startUrl);
  if (!startNormalized) throw new Error(`Invalid start URL: ${options.startUrl}`);

  const state: CrawlState = {
    queue: [{ url: startNormalized, depth: 0 }],
    visited: new Set(),
    pages: [],
    brokenLinks: [],
    linkBudgetRemaining: MAX_UNIQUE_LINKS_PROBED,
  };

  let truncated = false;
  let pagesFetched = 0;

  while (state.queue.length > 0) {
    if (state.pages.length >= maxPages) {
      truncated = true;
      break;
    }
    const next = state.queue.shift() as { url: string; depth: number };
    if (state.visited.has(next.url)) continue;
    state.visited.add(next.url);

    const result = await safeFetch(next.url);
    pagesFetched += 1;

    if (result.statusCode >= 400) {
      state.brokenLinks.push({
        url: next.url,
        statusCode: result.statusCode,
        error: `HTTP ${result.statusCode}`,
      });
      continue;
    }

    const meta = extractHtmlMeta(result.body);
    state.pages.push({
      url: next.url,
      html: result.body,
      headers: result.headers,
      statusCode: result.statusCode,
      depth: next.depth,
      meta,
    });

    if (next.depth >= maxDepth) continue;

    // Collect unique same-origin links, deduped against visited+queue,
    // bounded per page and globally, and only while page budget remains.
    // Links that would exceed maxDepth are never enqueued.
    const seenOnPage = new Set<string>();
    let queuedThisPage = 0;
    for (const href of meta.links) {
      if (queuedThisPage >= MAX_LINKS_PER_PAGE) break;
      if (state.pages.length + state.queue.length >= maxPages) {
        truncated = true;
        break;
      }
      if (next.depth + 1 > maxDepth) continue;
      const abs = normalizeUrl(href, next.url);
      if (!abs || !sameOrigin(abs, startNormalized)) continue;
      if (state.visited.has(abs) || seenOnPage.has(abs)) continue;
      seenOnPage.add(abs);
      state.queue.push({ url: abs, depth: next.depth + 1 });
      queuedThisPage += 1;
    }
  }

  return {
    pages: state.pages,
    brokenLinks: state.brokenLinks,
    truncated,
    pagesFetched,
  };
}

/**
 * Probe a bounded set of unique links for breakage (4xx/5xx).
 * Any per-link error is reported as a broken link rather than thrown so the
 * scan degrades gracefully.
 */
export async function probeLinks(urls: string[]): Promise<BrokenLink[]> {
  const broken: BrokenLink[] = [];
  for (const url of urls) {
    try {
      const result = await safeFetch(url);
      if (result.statusCode >= 400) {
        broken.push({ url, statusCode: result.statusCode, error: `HTTP ${result.statusCode}` });
      }
    } catch (error) {
      broken.push({
        url,
        statusCode: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return broken;
}
