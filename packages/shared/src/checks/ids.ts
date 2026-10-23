/**
 * Check ID constants - single source of truth for all scanner checks.
 * Categories: perf | seo | security
 */

// Performance checks (PageSpeed Insights)
export const PERF_CHECKS = {
  LCP: 'psi.lcp',
  CLS: 'psi.cls',
  INP: 'psi.inp',
  SCORE_MOBILE: 'psi.score_mobile',
  SCORE_DESKTOP: 'psi.score_desktop',
} as const;

// SEO checks
export const SEO_CHECKS = {
  TITLE: 'seo.title',
  META_DESCRIPTION: 'seo.meta_description',
  H1: 'seo.h1',
  CANONICAL: 'seo.canonical',
  ROBOTS_INDEXABILITY: 'seo.robots_indexability',
  BROKEN_LINKS: 'seo.broken_links',
} as const;

// Security checks
export const SECURITY_CHECKS = {
  HTTPS_REDIRECT: 'sec.https_redirect',
  TLS_VALID: 'sec.tls_valid',
  TLS_EXPIRY: 'sec.tls_expiry',
  HSTS: 'sec.hsts',
  CSP: 'sec.csp',
  X_CONTENT_TYPE_OPTIONS: 'sec.xcto',
  REFERRER_POLICY: 'sec.referrer_policy',
  FRAME_OPTIONS: 'sec.frame_options',
  COOKIE_FLAGS: 'sec.cookie_flags',
  SPF: 'sec.spf',
  DMARC: 'sec.dmarc',
} as const;

export const ALL_CHECK_IDS = {
  ...PERF_CHECKS,
  ...SEO_CHECKS,
  ...SECURITY_CHECKS,
} as const;

export type CheckId = (typeof ALL_CHECK_IDS)[keyof typeof ALL_CHECK_IDS];

export const CHECK_CATEGORIES: Record<CheckId, 'perf' | 'seo' | 'security'> = {
  [PERF_CHECKS.LCP]: 'perf',
  [PERF_CHECKS.CLS]: 'perf',
  [PERF_CHECKS.INP]: 'perf',
  [PERF_CHECKS.SCORE_MOBILE]: 'perf',
  [PERF_CHECKS.SCORE_DESKTOP]: 'perf',
  [SEO_CHECKS.TITLE]: 'seo',
  [SEO_CHECKS.META_DESCRIPTION]: 'seo',
  [SEO_CHECKS.H1]: 'seo',
  [SEO_CHECKS.CANONICAL]: 'seo',
  [SEO_CHECKS.ROBOTS_INDEXABILITY]: 'seo',
  [SEO_CHECKS.BROKEN_LINKS]: 'seo',
  [SECURITY_CHECKS.HTTPS_REDIRECT]: 'security',
  [SECURITY_CHECKS.TLS_VALID]: 'security',
  [SECURITY_CHECKS.TLS_EXPIRY]: 'security',
  [SECURITY_CHECKS.HSTS]: 'security',
  [SECURITY_CHECKS.CSP]: 'security',
  [SECURITY_CHECKS.X_CONTENT_TYPE_OPTIONS]: 'security',
  [SECURITY_CHECKS.REFERRER_POLICY]: 'security',
  [SECURITY_CHECKS.FRAME_OPTIONS]: 'security',
  [SECURITY_CHECKS.COOKIE_FLAGS]: 'security',
  [SECURITY_CHECKS.SPF]: 'security',
  [SECURITY_CHECKS.DMARC]: 'security',
};

export const CHECK_NAMES: Record<CheckId, string> = {
  [PERF_CHECKS.LCP]: 'Largest Contentful Paint',
  [PERF_CHECKS.CLS]: 'Cumulative Layout Shift',
  [PERF_CHECKS.INP]: 'Interaction to Next Paint',
  [PERF_CHECKS.SCORE_MOBILE]: 'PageSpeed Score (Mobile)',
  [PERF_CHECKS.SCORE_DESKTOP]: 'PageSpeed Score (Desktop)',
  [SEO_CHECKS.TITLE]: 'Page Title',
  [SEO_CHECKS.META_DESCRIPTION]: 'Meta Description',
  [SEO_CHECKS.H1]: 'H1 Heading',
  [SEO_CHECKS.CANONICAL]: 'Canonical URL',
  [SEO_CHECKS.ROBOTS_INDEXABILITY]: 'Robots & Indexability',
  [SEO_CHECKS.BROKEN_LINKS]: 'Broken Links',
  [SECURITY_CHECKS.HTTPS_REDIRECT]: 'HTTPS Redirect',
  [SECURITY_CHECKS.TLS_VALID]: 'TLS Certificate Valid',
  [SECURITY_CHECKS.TLS_EXPIRY]: 'TLS Certificate Expiry',
  [SECURITY_CHECKS.HSTS]: 'HSTS Header',
  [SECURITY_CHECKS.CSP]: 'Content Security Policy',
  [SECURITY_CHECKS.X_CONTENT_TYPE_OPTIONS]: 'X-Content-Type-Options Header',
  [SECURITY_CHECKS.REFERRER_POLICY]: 'Referrer-Policy Header',
  [SECURITY_CHECKS.FRAME_OPTIONS]: 'X-Frame-Options Header',
  [SECURITY_CHECKS.COOKIE_FLAGS]: 'Cookie Security Flags',
  [SECURITY_CHECKS.SPF]: 'SPF Record',
  [SECURITY_CHECKS.DMARC]: 'DMARC Record',
};