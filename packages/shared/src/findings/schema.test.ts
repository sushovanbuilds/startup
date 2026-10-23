import { describe, it, expect } from 'vitest';
import {
  FindingSchema,
  EvidenceSchema,
  ScanSummarySchema,
  generateFingerprint,
  type Finding,
  type Evidence,
  type ScanSummary,
} from '../findings/schema';

describe('Finding Schema', () => {
  const validEvidence: Evidence = {
    url: 'https://example.com',
    observed_value: '2.5s',
    expected: '< 2.5s',
    checked_at: new Date().toISOString(),
    check_name: 'Largest Contentful Paint',
    response_meta: { status: 200 },
  };

  it('validates a complete finding', () => {
    const finding: Finding = {
      check_id: 'psi.lcp',
      category: 'perf',
      severity: 'high',
      status: 'open',
      confidence: 'observed',
      evidence: validEvidence,
      fingerprint: 'abc123',
      ai_explanation: {
        summary: 'LCP is slow',
        why_it_matters: 'Affects user experience',
        priority: 'now',
        fix_steps: ['Optimize images', 'Reduce server response time'],
        example_fix: { platform: 'nginx', snippet: '...' },
        verify_steps: ['Re-run PageSpeed Insights'],
        caveats: ['May vary by device'],
      },
    };

    const result = FindingSchema.safeParse(finding);
    expect(result.success).toBe(true);
  });

  it('validates finding without ai_explanation', () => {
    const finding: Finding = {
      check_id: 'seo.title',
      category: 'seo',
      severity: 'medium',
      status: 'open',
      confidence: 'observed',
      evidence: validEvidence,
      fingerprint: 'def456',
    };

    const result = FindingSchema.safeParse(finding);
    expect(result.success).toBe(true);
  });

  it('rejects invalid category', () => {
    const finding = {
      check_id: 'psi.lcp',
      category: 'invalid',
      severity: 'high',
      status: 'open',
      confidence: 'observed',
      evidence: validEvidence,
      fingerprint: 'abc123',
    };

    const result = FindingSchema.safeParse(finding);
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity', () => {
    const finding = {
      check_id: 'psi.lcp',
      category: 'perf',
      severity: 'critical',
      status: 'open',
      confidence: 'observed',
      evidence: validEvidence,
      fingerprint: 'abc123',
    };

    const result = FindingSchema.safeParse(finding);
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const finding = {
      check_id: 'psi.lcp',
      category: 'perf',
      severity: 'high',
      status: 'fixed',
      confidence: 'observed',
      evidence: validEvidence,
      fingerprint: 'abc123',
    };

    const result = FindingSchema.safeParse(finding);
    expect(result.success).toBe(false);
  });

  it('rejects invalid confidence', () => {
    const finding = {
      check_id: 'psi.lcp',
      category: 'perf',
      severity: 'high',
      status: 'open',
      confidence: 'guessed',
      evidence: validEvidence,
      fingerprint: 'abc123',
    };

    const result = FindingSchema.safeParse(finding);
    expect(result.success).toBe(false);
  });

  it('validates evidence schema', () => {
    const result = EvidenceSchema.safeParse(validEvidence);
    expect(result.success).toBe(true);
  });

  it('rejects evidence with invalid URL', () => {
    const invalidEvidence = { ...validEvidence, url: 'not-a-url' };
    const result = EvidenceSchema.safeParse(invalidEvidence);
    expect(result.success).toBe(false);
  });

  it('validates scan summary schema', () => {
    const summary: ScanSummary = {
      total_checks: 22,
      passed: 15,
      failed: 7,
      by_category: {
        perf: { passed: 4, failed: 1 },
        seo: { passed: 5, failed: 1 },
        security: { passed: 6, failed: 5 },
      },
      by_severity: {
        high: 2,
        medium: 3,
        low: 2,
        info: 0,
      },
    };

    const result = ScanSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});

describe('generateFingerprint', () => {
  it('generates consistent fingerprint for same inputs', () => {
    const fp1 = generateFingerprint('psi.lcp', 'https://example.com', '2.5s');
    const fp2 = generateFingerprint('psi.lcp', 'https://example.com', '2.5s');
    expect(fp1).toBe(fp2);
  });

  it('generates different fingerprints for different check_ids', () => {
    const fp1 = generateFingerprint('psi.lcp', 'https://example.com', '2.5s');
    const fp2 = generateFingerprint('psi.cls', 'https://example.com', '2.5s');
    expect(fp1).not.toBe(fp2);
  });

  it('generates different fingerprints for different URLs', () => {
    const fp1 = generateFingerprint('psi.lcp', 'https://example.com', '2.5s');
    const fp2 = generateFingerprint('psi.lcp', 'https://other.com', '2.5s');
    expect(fp1).not.toBe(fp2);
  });

  it('generates different fingerprints for different observed values', () => {
    const fp1 = generateFingerprint('psi.lcp', 'https://example.com', '2.5s');
    const fp2 = generateFingerprint('psi.lcp', 'https://example.com', '3.0s');
    expect(fp1).not.toBe(fp2);
  });

  it('handles object observed values', () => {
    const fp1 = generateFingerprint('seo.broken_links', 'https://example.com', { broken: ['/page1', '/page2'] });
    const fp2 = generateFingerprint('seo.broken_links', 'https://example.com', { broken: ['/page1', '/page2'] });
    expect(fp1).toBe(fp2);
  });
});