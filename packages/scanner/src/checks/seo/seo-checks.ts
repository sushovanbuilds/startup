/**
 * SEO checks producing findings per the FindingSchema in packages/shared.
 *
 * Checks (FINDINGS-SPEC catalog):
 * seo.title, seo.meta_description, seo.h1, seo.canonical,
 * seo.robots_indexability, seo.broken_links
 *
 * Severity bias: under-report. A missing element is low/medium "needs review",
 * never framed as broken or high severity.
 */
import {
  generateFingerprint,
  CHECK_NAMES,
  SEO_CHECKS,
  type Finding,
  type Evidence,
  type CheckId,
} from '@sitehealth/shared';
import { normalizeUrlSafe } from './url-utils';
import { boundedCrawl, probeLinks, MAX_UNIQUE_LINKS_PROBED } from './crawler';
import { isNoindex } from './html-extract';

export const TITLE_MIN_LENGTH = 10;
export const TITLE_MAX_LENGTH = 60;
export const DESCRIPTION_MAX_LENGTH = 160;

interface CheckInput {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  canonical: string | null;
  noindex: boolean;
  brokenLinks: Array<{ url: string; statusCode: number | null; error?: string }>;
  checkedAt: string;
  responseMeta?: Record<string, unknown>;
}

type Severity = 'info' | 'low' | 'medium' | 'high';

function buildFinding(input: CheckInput, checkId: CheckId, severity: Severity,
  observedValue: unknown, expected: unknown, responseMetaExtra?: Record<string, unknown>): Finding {
  const evidence: Evidence = {
    url: input.url,
    observed_value: observedValue,
    expected,
    checked_at: input.checkedAt,
    check_name: CHECK_NAMES[checkId],
    response_meta: { ...input.responseMeta, ...responseMetaExtra },
  };
  const fingerprint = generateFingerprint(checkId, input.url, observedValue);
  return {
    check_id: checkId,
    category: 'seo',
    severity,
    status: severity === 'info' ? 'resolved' : 'open',
    confidence: 'observed',
    evidence,
    fingerprint,
  };
}

export function checkTitle(input: CheckInput): Finding {
  if (input.title === null) {
    return buildFinding(input, SEO_CHECKS.TITLE, 'medium', 'missing', `${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} chars`);
  }
  const len = input.title.length;
  if (len < TITLE_MIN_LENGTH) {
    return buildFinding(input, SEO_CHECKS.TITLE, 'low', len, `${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} chars`);
  }
  if (len > TITLE_MAX_LENGTH) {
    return buildFinding(input, SEO_CHECKS.TITLE, 'low', len, `${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} chars`);
  }
  const observed = `${len} chars`;
  return buildFinding(input, SEO_CHECKS.TITLE, 'info', observed, `${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} chars`);
}

export function checkMetaDescription(input: CheckInput): Finding {
  if (input.metaDescription === null) {
    return buildFinding(input, SEO_CHECKS.META_DESCRIPTION, 'low', 'missing', `1-${DESCRIPTION_MAX_LENGTH} chars`);
  }
  const len = input.metaDescription.length;
  if (len > DESCRIPTION_MAX_LENGTH) {
    return buildFinding(input, SEO_CHECKS.META_DESCRIPTION, 'low', len, `1-${DESCRIPTION_MAX_LENGTH} chars`);
  }
  return buildFinding(
    input,
    SEO_CHECKS.META_DESCRIPTION,
    'info',
    `${len} chars`,
    `1-${DESCRIPTION_MAX_LENGTH} chars`
  );
}

export function checkH1(input: CheckInput): Finding {
  if (input.h1Count === 0) {
    return buildFinding(input, SEO_CHECKS.H1, 'low', 0, 'exactly 1');
  }
  if (input.h1Count > 1) {
    return buildFinding(input, SEO_CHECKS.H1, 'low', input.h1Count, 'exactly 1');
  }
  return buildFinding(input, SEO_CHECKS.H1, 'info', 1, 'exactly 1');
}

export function checkCanonical(input: CheckInput): Finding {
  if (input.canonical === null) {
    return buildFinding(input, SEO_CHECKS.CANONICAL, 'low', 'missing', 'an absolute canonical URL');
  }
  const resolved = normalizeUrlSafe(input.canonical);
  if (resolved === null) {
    return buildFinding(input, SEO_CHECKS.CANONICAL, 'low', input.canonical, 'an absolute canonical URL');
  }
  return buildFinding(input, SEO_CHECKS.CANONICAL, 'info', input.canonical, 'an absolute canonical URL');
}

export function checkRobotsIndexability(input: CheckInput): Finding {
  if (input.noindex) {
    return buildFinding(input, SEO_CHECKS.ROBOTS_INDEXABILITY, 'medium', 'noindex', 'indexable');
  }
  return buildFinding(input, SEO_CHECKS.ROBOTS_INDEXABILITY, 'info', 'indexable', 'indexable');
}

export function checkBrokenLinks(input: CheckInput): Finding {
  const count = input.brokenLinks.length;
  if (count === 0) {
    return buildFinding(input, SEO_CHECKS.BROKEN_LINKS, 'info', 0, '0 broken links');
  }
  const severity: Severity = count >= 3 ? 'medium' : 'low';
  return buildFinding(input, SEO_CHECKS.BROKEN_LINKS, severity, count, '0 broken links', {
    broken_examples: input.brokenLinks.slice(0, 5),
  });
}

/**
 * Run all SEO checks for one crawled page's evidence.
 */
export function runSeoChecksForPage(input: CheckInput): Finding[] {
  return [
    checkTitle(input),
    checkMetaDescription(input),
    checkH1(input),
    checkCanonical(input),
    checkRobotsIndexability(input),
    checkBrokenLinks(input),
  ];
}

export interface SeoScanOptions {
  maxPages?: number;
  maxDepth?: number;
}

/**
 * Orchestration: bounded crawl -> bounded broken-link probing -> findings.
 * Findings are produced per crawled page (depth 0 = start page).
 */
export async function runSeoChecks(
  startUrl: string,
  options: SeoScanOptions = {}
): Promise<{ findings: Finding[]; pagesFetched: number; truncated: boolean }> {
  const crawl = await boundedCrawl({
    startUrl,
    maxPages: options.maxPages,
    maxDepth: options.maxDepth,
  });

  const checkedAt = new Date().toISOString();

  // Broken-link probing: unique, bounded; links broken at crawl time are
  // already recorded. Other links probed only up to the global budget.
  const crawledUrlSet = new Set(crawl.pages.map((p) => p.url));
  const candidates: string[] = [];
  const probedSet = new Set<string>();
  const alreadyBroken = new Set(crawl.brokenLinks.map((b) => b.url));
  for (const page of crawl.pages) {
    for (const href of page.meta.links) {
      if (probedSet.size >= MAX_UNIQUE_LINKS_PROBED) break;
      const abs = normalizeUrlSafe(href, page.url);
      if (!abs || probedSet.has(abs) || crawledUrlSet.has(abs) || alreadyBroken.has(abs)) continue;
      probedSet.add(abs);
      candidates.push(abs);
    }
  }
  const brokenLinks = [...crawl.brokenLinks, ...(await probeLinks(candidates))];

  const findings: Finding[] = [];
  for (const page of crawl.pages) {
    findings.push(
      ...runSeoChecksForPage({
        url: page.url,
        title: page.meta.title,
        metaDescription: page.meta.metaDescription,
        h1Count: page.meta.h1Count,
        canonical: page.meta.canonical,
        // Header-based and meta-based robots directives both count.
        noindex:
          isNoindex(page.meta.robotsMetaContent) ||
          isNoindex(page.headers['x-robots-tag'] ?? page.headers['X-Robots-Tag']),
        brokenLinks,
        checkedAt,
        responseMeta: { depth: page.depth },
      })
    );
  }

  return { findings, pagesFetched: crawl.pagesFetched, truncated: crawl.truncated };
}
