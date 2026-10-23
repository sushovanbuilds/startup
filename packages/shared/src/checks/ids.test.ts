import { describe, it, expect } from 'vitest';
import {
  PERF_CHECKS,
  SEO_CHECKS,
  SECURITY_CHECKS,
  ALL_CHECK_IDS,
  CHECK_CATEGORIES,
  CHECK_NAMES,
  type CheckId,
} from './ids';

describe('Check IDs', () => {
  it('has all perf check IDs defined', () => {
    expect(PERF_CHECKS.LCP).toBe('psi.lcp');
    expect(PERF_CHECKS.CLS).toBe('psi.cls');
    expect(PERF_CHECKS.INP).toBe('psi.inp');
    expect(PERF_CHECKS.SCORE_MOBILE).toBe('psi.score_mobile');
    expect(PERF_CHECKS.SCORE_DESKTOP).toBe('psi.score_desktop');
  });

  it('has all seo check IDs defined', () => {
    expect(SEO_CHECKS.TITLE).toBe('seo.title');
    expect(SEO_CHECKS.META_DESCRIPTION).toBe('seo.meta_description');
    expect(SEO_CHECKS.H1).toBe('seo.h1');
    expect(SEO_CHECKS.CANONICAL).toBe('seo.canonical');
    expect(SEO_CHECKS.ROBOTS_INDEXABILITY).toBe('seo.robots_indexability');
    expect(SEO_CHECKS.BROKEN_LINKS).toBe('seo.broken_links');
  });

  it('has all security check IDs defined', () => {
    expect(SECURITY_CHECKS.HTTPS_REDIRECT).toBe('sec.https_redirect');
    expect(SECURITY_CHECKS.TLS_VALID).toBe('sec.tls_valid');
    expect(SECURITY_CHECKS.TLS_EXPIRY).toBe('sec.tls_expiry');
    expect(SECURITY_CHECKS.HSTS).toBe('sec.hsts');
    expect(SECURITY_CHECKS.CSP).toBe('sec.csp');
    expect(SECURITY_CHECKS.X_CONTENT_TYPE_OPTIONS).toBe('sec.xcto');
    expect(SECURITY_CHECKS.REFERRER_POLICY).toBe('sec.referrer_policy');
    expect(SECURITY_CHECKS.FRAME_OPTIONS).toBe('sec.frame_options');
    expect(SECURITY_CHECKS.COOKIE_FLAGS).toBe('sec.cookie_flags');
    expect(SECURITY_CHECKS.SPF).toBe('sec.spf');
    expect(SECURITY_CHECKS.DMARC).toBe('sec.dmarc');
  });

  it('ALL_CHECK_IDS contains all checks', () => {
    const allKeys = Object.keys(ALL_CHECK_IDS);
    const expectedCount = 5 + 6 + 11; // perf + seo + security
    expect(allKeys).toHaveLength(expectedCount);
  });

  it('every check ID has a category', () => {
    for (const checkId of Object.values(ALL_CHECK_IDS)) {
      expect(CHECK_CATEGORIES[checkId as CheckId]).toBeDefined();
      expect(['perf', 'seo', 'security']).toContain(CHECK_CATEGORIES[checkId as CheckId]);
    }
  });

  it('every check ID has a human-readable name', () => {
    for (const checkId of Object.values(ALL_CHECK_IDS)) {
      expect(CHECK_NAMES[checkId as CheckId]).toBeDefined();
      expect(typeof CHECK_NAMES[checkId as CheckId]).toBe('string');
      expect(CHECK_NAMES[checkId as CheckId].length).toBeGreaterThan(0);
    }
  });

  it('category mapping matches spec', () => {
    // Perf checks
    expect(CHECK_CATEGORIES[PERF_CHECKS.LCP]).toBe('perf');
    expect(CHECK_CATEGORIES[PERF_CHECKS.SCORE_MOBILE]).toBe('perf');
    // SEO checks
    expect(CHECK_CATEGORIES[SEO_CHECKS.TITLE]).toBe('seo');
    expect(CHECK_CATEGORIES[SEO_CHECKS.BROKEN_LINKS]).toBe('seo');
    // Security checks
    expect(CHECK_CATEGORIES[SECURITY_CHECKS.TLS_VALID]).toBe('security');
    expect(CHECK_CATEGORIES[SECURITY_CHECKS.SPF]).toBe('security');
  });
});