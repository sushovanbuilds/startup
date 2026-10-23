/**
 * Fixture-based tests for SEO checks + bounded crawler.
 * safe-fetch is fully mocked: no live calls in tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FindingSchema, SEO_CHECKS } from '@sitehealth/shared';

// Mock safe-fetch so the crawler never makes live calls.
const { safeFetchMock } = vi.hoisted(() => ({
  safeFetchMock: vi.fn(),
}));

vi.mock('../../net/safe-fetch', () => ({
  safeFetch: safeFetchMock,
  setResolverForTesting: vi.fn(),
}));

import { extractHtmlMeta, isNoindex, unescapeHtml } from './html-extract';
import { boundedCrawl, MAX_LINKS_PER_PAGE, MAX_UNIQUE_LINKS_PROBED } from './crawler';
import {
  runSeoChecksForPage,
  runSeoChecks,
  checkTitle,
  checkMetaDescription,
  checkH1,
  checkCanonical,
  checkRobotsIndexability,
  checkBrokenLinks,
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
} from './seo-checks';

const FIXTURES = join(__dirname, '__fixtures__');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8');
}

const BASE_INPUT = {
  url: 'https://example-coffee.test/',
  title: 'A perfectly reasonable page title',
  metaDescription: 'A sensible description within limits.',
  h1Count: 1,
  canonical: 'https://example-coffee.test/',
  noindex: false,
  brokenLinks: [] as Array<{ url: string; statusCode: number | null; error?: string }>,
  checkedAt: '2026-10-23T00:00:00.000Z',
};

function mockSafeFetchMap(map: Record<string, { status: number; body?: string; headers?: Record<string, string> }>) {
  safeFetchMock.mockImplementation(async (url: string) => {
    const key = Object.keys(map).find((k) => new URL(k).host === new URL(url).host && k === url);
    const entry = key ? map[url] : undefined;
    if (!entry) {
      return { statusCode: 404, headers: {}, body: 'not found', finalUrl: url, redirected: false, redirectChain: [] };
    }
    return {
      statusCode: entry.status,
      headers: entry.headers ?? {},
      body: entry.body ?? '',
      finalUrl: url,
      redirected: false,
      redirectChain: [],
    };
  });
}

describe('extractHtmlMeta', () => {
  it('extracts title, description, canonical, h1 and links from good fixture', () => {
    const meta = extractHtmlMeta(fixture('good.html'));
    expect(meta.title).toBe('Example Coffee Roasters — Fresh Roasted Beans');
    expect(meta.metaDescription).toBe(
      'Small-batch specialty coffee, roasted weekly and shipped fresh. Beans, gear and brewing guides for home baristas.'
    );
    expect(meta.h1Count).toBe(1);
    expect(meta.h1Texts[0]).toBe('Fresh roasted coffee, every week');
    expect(meta.canonical).toBe('https://example-coffee.test/');
    // mailto and external links are all hrefs on the page
    expect(meta.links).toContain('/shop');
    expect(meta.links).toContain('/about');
    expect(meta.links.some((l) => l.startsWith('mailto:'))).toBe(false);
  });

  it('returns null title/description when markup is missing', () => {
    const meta = extractHtmlMeta('<html><body><p>Hello</p></body></html>');
    expect(meta.title).toBeNull();
    expect(meta.metaDescription).toBeNull();
    expect(meta.h1Count).toBe(0);
    expect(meta.canonical).toBeNull();
    expect(meta.robotsMetaContent).toBeNull();
  });

  it('unescapes entities and collapses whitespace in title', () => {
    const meta = extractHtmlMeta('<title>Tom &amp;\nJerry&#39;s</title>');
    expect(meta.title).toBe("Tom & Jerry's");
  });

  it('detects noindex robots meta and x-robots-tag values', () => {
    expect(isNoindex(extractHtmlMeta(fixture('noindex-multi-h1.html')).robotsMetaContent)).toBe(true);
    expect(isNoindex('INDEX, FOLLOW')).toBe(false);
    expect(isNoindex('NOINDEX')).toBe(true);
    expect(isNoindex(null)).toBe(false);
  });

  it('skips fragment-only and non-document links', () => {
    const meta = extractHtmlMeta('<a href="#top">Top</a><a href="mailto:x">x</a><a href="/real">Go</a>');
    expect(meta.links).toEqual(['/real']);
  });
});

describe('individual SEO checks', () => {
  it('title: long title is low', () => {
    const input = { ...BASE_INPUT, title: 'x'.repeat(TITLE_MAX_LENGTH + 10) };
    expect(checkTitle(input).severity).toBe('low');
  });
  it('title: too-short title is low; missing is medium', () => {
    expect(checkTitle({ ...BASE_INPUT, title: 'tiny' }).severity).toBe('low');
    expect(checkTitle({ ...BASE_INPUT, title: null }).severity).toBe('medium');
  });
  it('title: within range is info/resolved', () => {
    const f = checkTitle(BASE_INPUT);
    expect(f.severity).toBe('info');
    expect(f.status).toBe('resolved');
  });
  it('meta description: missing low, over-limit low, good info', () => {
    expect(checkMetaDescription({ ...BASE_INPUT, metaDescription: null }).severity).toBe('low');
    expect(checkMetaDescription({ ...BASE_INPUT, metaDescription: 'd'.repeat(DESCRIPTION_MAX_LENGTH + 1) }).severity).toBe('low');
    expect(checkMetaDescription(BASE_INPUT).severity).toBe('info');
  });
  it('h1: zero low, multiple low, exactly one info', () => {
    expect(checkH1({ ...BASE_INPUT, h1Count: 0 }).severity).toBe('low');
    expect(checkH1({ ...BASE_INPUT, h1Count: 3 }).severity).toBe('low');
    expect(checkH1(BASE_INPUT).severity).toBe('info');
  });
  it('canonical: missing low (needs review, not an alarm)', () => {
    expect(checkCanonical({ ...BASE_INPUT, canonical: null }).severity).toBe('low');
  });
  it('canonical: non-absolute href still resolvable relative is info', () => {
    const f = checkCanonical({ ...BASE_INPUT, canonical: '/preferred-url' });
    expect(f.severity).toBe('info');
  });
  it('canonical: only missing is flagged; any resolvable href passes', () => {
    // WHATWG URL resolution makes almost any string resolvable against a base,
    // so only an absent canonical is reported (under-reporting bias).
    expect(checkCanonical({ ...BASE_INPUT, canonical: null }).severity).toBe('low');
    expect(checkCanonical({ ...BASE_INPUT, canonical: '/preferred-url' }).severity).toBe('info');
  });
  it('robots_indexability: noindex is medium, not "vulnerable" keywords', () => {
    const f = checkRobotsIndexability({ ...BASE_INPUT, noindex: true });
    expect(f.severity).toBe('medium');
    const serialized = JSON.stringify(f.evidence);
    expect(serialized.toLowerCase()).not.toContain('vulnerab');
    expect(serialized.toLowerCase()).not.toContain('hacked');
  });
  it('broken links: 0 info, 2 low, 3 medium', () => {
    const bl = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ url: `https://example-coffee.test/x${i}`, statusCode: 404, error: 'HTTP 404' }));
    expect(checkBrokenLinks({ ...BASE_INPUT, brokenLinks: [] }).severity).toBe('info');
    expect(checkBrokenLinks({ ...BASE_INPUT, brokenLinks: bl(2) }).severity).toBe('low');
    expect(checkBrokenLinks({ ...BASE_INPUT, brokenLinks: bl(3) }).severity).toBe('medium');
  });
  it('every check validates against FindingSchema and has a fingerprint', () => {
    for (const f of runSeoChecksForPage(BASE_INPUT)) {
      const parsed = FindingSchema.parse(f);
      expect(parsed.fingerprint).toBeTruthy();
      expect(parsed.category).toBe('seo');
    }
  });
});

describe('bounded crawler', () => {
  beforeEach(() => {
    safeFetchMock.mockReset();
  });

  it('follows same-origin links up to depth, external links never fetched', async () => {
    mockSafeFetchMap({
      'https://example-coffee.test/': { status: 200, body: fixture('good.html') },
      'https://example-coffee.test/shop': { status: 200, body: fixture('page2.html') },
      'https://example-coffee.test/about': { status: 200, body: fixture('page2.html') },
      'https://partner-site.test/offer': { status: 200, body: '<html><body>x</body></html>' },
    });

    const result = await boundedCrawl({ startUrl: 'https://example-coffee.test/', maxPages: 10 });

    const fetchedUrls = safeFetchMock.mock.calls.map((c) => c[0]);
    expect(fetchedUrls).toContain('https://example-coffee.test/shop');
    expect(fetchedUrls).toContain('https://example-coffee.test/about');
    // External link must NOT be fetched
    expect(fetchedUrls.some((u: string) => new URL(u).host !== 'example-coffee.test')).toBe(false);
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].depth).toBe(0);
    expect(result.pages.find((p) => p.url.includes('/shop'))?.depth).toBe(1);
  });

  it('respects maxPages (free-tier single page scan)', async () => {
    mockSafeFetchMap({
      'https://example-coffee.test/': { status: 200, body: fixture('good.html') },
      'https://example-coffee.test/shop': { status: 200, body: fixture('page2.html') },
      'https://example-coffee.test/about': { status: 200, body: fixture('page2.html') },
    });

    const result = await boundedCrawl({ startUrl: 'https://example-coffee.test/', maxPages: 1 });
    expect(result.pages).toHaveLength(1);
    expect(safeFetchMock).toHaveBeenCalledTimes(1);
    expect(result.truncated).toBe(true);
  });

  it('does not exceed MAX_LINKS_PER_PAGE links queued from one page', async () => {
    // Page with more links than the per-page cap
    const manyLinksHtml =
      '<html><body>' +
      Array.from({ length: MAX_LINKS_PER_PAGE + 5 }, (_, i) => `<a href="/l${i}">L${i}</a>`).join('') +
      '</body></html>';
    mockSafeFetchMap({
      'https://example-coffee.test/': { status: 200, body: manyLinksHtml },
    });
    await boundedCrawl({ startUrl: 'https://example-coffee.test/', maxPages: 99 });

    // Only maxPages-bounded subset enqueued... verify queued call count is capped:
    // start page + at most MAX_LINKS_PER_PAGE children
    const calls = safeFetchMock.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(1 + MAX_LINKS_PER_PAGE);
  });

  it('does not exceed the global unique-link probe budget', async () => {
    const pageFor = (n: number) =>
      `<html><body><a href="/l${n + 1}">next</a></body></html>`;
    const map: Record<string, { status: number; body: string }> = {
      'https://example-coffee.test/': { status: 200, body: pageFor(0) },
    };
    // Build MAX_UNIQUE_LINKS_PROBED chain pages
    for (let i = 1; i <= MAX_UNIQUE_LINKS_PROBED + 20; i++) {
      map[`https://example-coffee.test/l${i}`] = { status: 200, body: pageFor(i) };
    }
    mockSafeFetchMap(map);
    await boundedCrawl({ startUrl: 'https://example-coffee.test/', maxPages: 999 });
    expect(safeFetchMock.mock.calls.length).toBeLessThanOrEqual(MAX_UNIQUE_LINKS_PROBED + 1);
  });

  it('records 4xx responses as broken links, does not count them as pages', async () => {
    mockSafeFetchMap({
      'https://example-coffee.test/': { status: 200, body: '<a href="/missing">x</a>' },
      'https://example-coffee.test/missing': { status: 404, body: 'nope' },
    });
    const result = await boundedCrawl({ startUrl: 'https://example-coffee.test/', maxPages: 5 });
    expect(result.pages).toHaveLength(1);
    expect(result.brokenLinks).toHaveLength(1);
    expect(result.brokenLinks[0].statusCode).toBe(404);
  });

  it('dedupes repeated links and ignores fragments', async () => {
    mockSafeFetchMap({
      'https://example-coffee.test/': { status: 200, body: '<a href="/shop">a</a><a href="/shop">b</a><a href="/shop#frag">c</a>' },
      'https://example-coffee.test/shop': { status: 200, body: fixture('page2.html') },
    });
    const result = await boundedCrawl({ startUrl: 'https://example-coffee.test/', maxPages: 5 });
    expect(safeFetchMock.mock.calls.length).toBe(2);
    expect(result.pages).toHaveLength(2);
  });

  it('caps depth at maxDepth (default 2)', async () => {
    const link = (n: number) => `<html><body><a href="/l${n + 1}">next</a></body></html>`;
    mockSafeFetchMap({
      'https://example-coffee.test/': { status: 200, body: link(0) },
      'https://example-coffee.test/l1': { status: 200, body: link(1) },
      'https://example-coffee.test/l2': { status: 200, body: link(2) },
      'https://example-coffee.test/l3': { status: 200, body: link(3) },
    });
    const result = await boundedCrawl({ startUrl: 'https://example-coffee.test/' });
    const depths = result.pages.map((p) => p.depth);
    expect(Math.max(...depths)).toBe(2);
    expect(safeFetchMock.mock.calls.length).toBe(3);
  });
});

describe('runSeoChecks end-to-end (mocked network)', () => {
  beforeEach(() => {
    safeFetchMock.mockReset();
  });

  it('produces all six check ids on a healthy site', async () => {
    mockSafeFetchMap({
      'https://example-coffee.test/': { status: 200, body: fixture('good.html') },
      'https://example-coffee.test/shop': { status: 200, body: fixture('page2.html') },
      'https://example-coffee.test/about': { status: 200, body: fixture('page2.html') },
    });

    const { findings } = await runSeoChecks('https://example-coffee.test/', { maxPages: 3 });
    const ids = new Set(findings.map((f) => f.check_id));
    for (const id of Object.values(SEO_CHECKS)) {
      expect(ids).toContain(id);
    }
    for (const f of findings) {
      expect(() => FindingSchema.parse(f)).not.toThrow();
    }
  });

  it('reports broken links through the full pipeline', async () => {
    mockSafeFetchMap({
      'https://example-coffee.test/': { status: 200, body: '<a href="/missing">x</a><a href="/missing2">y</a>' },
      'https://example-coffee.test/missing': { status: 404, body: 'nope' },
      'https://example-coffee.test/missing2': { status: 500, body: 'err' },
    });

    const { findings } = await runSeoChecks('https://example-coffee.test/', { maxPages: 1 });
    // Probe budget: both links are probed and both 4xx/5xx → reported twice
    const brokenFinding = findings.find(
      (f) => f.check_id === SEO_CHECKS.BROKEN_LINKS
    );
    expect(brokenFinding?.severity).toBe('low'); // 2 broken → low band
    expect(brokenFinding?.evidence.response_meta?.['broken_examples']).toHaveLength(2);
  });

  it('detects noindex from html meta in a full run', async () => {
    mockSafeFetchMap({
      'https://example-coffee.test/': { status: 200, body: fixture('noindex-multi-h1.html') },
    });
    const { findings } = await runSeoChecks('https://example-coffee.test/', { maxPages: 1 });
    const robots = findings.find((f) => f.check_id === SEO_CHECKS.ROBOTS_INDEXABILITY);
    expect(robots?.severity).toBe('medium');
    expect(robots?.evidence.observed_value).toBe('noindex');
    const h1 = findings.find((f) => f.check_id === SEO_CHECKS.H1);
    expect(h1?.severity).toBe('low');
    expect(h1?.evidence.observed_value).toBe(2);
  });

  it('detects noindex from X-Robots-Tag header', async () => {
    mockSafeFetchMap({
      'https://example-coffee.test/': {
        status: 200,
        body: fixture('page2.html'),
        headers: { 'x-robots-tag': 'noindex' },
      },
    });
    const { findings } = await runSeoChecks('https://example-coffee.test/', { maxPages: 1 });
    const robots = findings.find((f) => f.check_id === SEO_CHECKS.ROBOTS_INDEXABILITY);
    expect(robots?.severity).toBe('medium');
  });

  it('free-tier single-page style scan fetches exactly one page', async () => {
    mockSafeFetchMap({
      'https://example-coffee.test/': { status: 200, body: fixture('good.html') },
      'https://example-coffee.test/shop': { status: 200, body: fixture('page2.html') },
      'https://example-coffee.test/about': { status: 200, body: fixture('page2.html') },
    });
    const { pagesFetched } = await runSeoChecks('https://example-coffee.test/', { maxPages: 1 });
    expect(pagesFetched).toBe(1);
    // 6 findings per page × 1 page
    expect((await runSeoChecks('https://example-coffee.test/', { maxPages: 1 })).findings).toHaveLength(6);
  });
});

describe('unescapeHtml edge cases', () => {
  it('handles numeric and hex entities', () => {
    expect(unescapeHtml('&#39;')).toBe("'");
    expect(unescapeHtml('&#x26;')).toBe('&');
  });
});
