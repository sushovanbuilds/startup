/**
 * Fixture-based tests for the PSI client and perf checks.
 * All network access is mocked: no live calls in tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FindingSchema, PERF_CHECKS } from '@sitehealth/shared';

// Mock safe-fetch so the PSI client never makes live calls.
const { safeFetchMock } = vi.hoisted(() => ({
  safeFetchMock: vi.fn(),
}));

vi.mock('../../net/safe-fetch', () => ({
  safeFetch: safeFetchMock,
  // Anything else psi-client may import from safe-fetch:
  setResolverForTesting: vi.fn(),
}));

import {
  PSIClient,
  PSIQuotaError,
  PSIApiKeyError,
  PSIInvalidUrlError,
  PSIApiError,
  resetPSIClient,
} from './psi-client';
import type { PerfCheckConfig } from './perf-checks';
import { runPerfChecks } from './perf-checks';

const FIXTURES = join(__dirname, '__fixtures__');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8');
}

function mockPSIResponse(fixtureName: string, statusCode = 200) {
  safeFetchMock.mockResolvedValue({
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: loadFixture(fixtureName),
    finalUrl: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
    redirected: false,
    redirectChain: [],
  });
}

describe('PSI client', () => {
  beforeEach(() => {
    safeFetchMock.mockReset();
    resetPSIClient();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches mobile metrics from a good fixture', async () => {
    mockPSIResponse('psi-good.json');
    const client = new PSIClient({ apiKey: 'test-key' });
    const metrics = await client.fetch('https://example.com/', 'mobile');

    expect(metrics.lcpMs).toBe(1600); // field data preferred over lab data
    expect(metrics.cls).toBe(0.04);
    expect(metrics.inpMs).toBe(120);
    expect(metrics.score).toBe(0.95);
    expect(metrics.strategy).toBe('mobile');

    // API key must be sent as a query param (server-side, never in client bundles)
    const calledUrl = safeFetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('key=test-key');
    expect(calledUrl).toContain('strategy=mobile');
    expect(calledUrl).toContain('url=https%3A%2F%2Fexample.com%2F');
  });

  it('prefers field data over lab data (desktop)', async () => {
    mockPSIResponse('psi-good.json');
    const client = new PSIClient();
    const metrics = await client.fetch('https://example.com/', 'desktop');
    // field LCP 1600 wins over audit numericValue 1800
    expect(metrics.lcpMs).toBe(1600);
    expect(metrics.strategy).toBe('desktop');
  });

  it('caches responses and does not re-call the API within TTL', async () => {
    mockPSIResponse('psi-good.json');
    const client = new PSIClient({ cacheTTLMs: 60_000 });

    await client.fetch('https://example.com/', 'mobile');
    await client.fetch('https://example.com/', 'mobile');

    expect(safeFetchMock).toHaveBeenCalledTimes(1);
    expect(client.getCacheStats().size).toBe(1);
  });

  it('separates cache entries per strategy', async () => {
    mockPSIResponse('psi-good.json');
    const client = new PSIClient({ cacheTTLMs: 60_000 });

    await client.fetch('https://example.com/', 'mobile');
    await client.fetch('https://example.com/', 'desktop');

    expect(safeFetchMock).toHaveBeenCalledTimes(2);
    expect(client.getCacheStats().size).toBe(2);
  });

  it('expires cache entries after TTL', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    mockPSIResponse('psi-good.json');
    const client = new PSIClient({ cacheTTLMs: 60_000 });

    await client.fetch('https://example.com/', 'mobile');
    vi.setSystemTime(now + 61_000);
    await client.fetch('https://example.com/', 'mobile');

    expect(safeFetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache failed responses', async () => {
    mockPSIResponse('psi-quota-error.json', 429);
    const client = new PSIClient();

    await expect(client.fetch('https://example.com/', 'mobile')).rejects.toThrow(PSIQuotaError);
    expect(client.getCacheStats().size).toBe(0);
  });

  it('maps 429 to PSIQuotaError', async () => {
    mockPSIResponse('psi-quota-error.json', 429);
    const client = new PSIClient();

    const err = await client.fetch('https://example.com/', 'mobile').catch((e) => e);
    expect(err).toBeInstanceOf(PSIQuotaError);
    expect(err.statusCode).toBe(429);
  });

  it('maps invalid API key to PSIApiKeyError', async () => {
    mockPSIResponse('psi-api-key-error.json', 400);
    const client = new PSIClient();

    const err = await client.fetch('https://example.com/', 'mobile').catch((e) => e);
    expect(err).toBeInstanceOf(PSIApiKeyError);
    expect(err.statusCode).toBe(400);
  });

  it('maps non-JSON error bodies to a generic PSIApiError', async () => {
    safeFetchMock.mockResolvedValue({
      statusCode: 503,
      headers: {},
      body: '<html>Service Unavailable</html>',
      finalUrl: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
      redirected: false,
      redirectChain: [],
    });
    const client = new PSIClient();

    const err = await client.fetch('https://example.com/', 'mobile').catch((e) => e);
    expect(err).toBeInstanceOf(PSIApiError);
    expect(err.statusCode).toBe(503);
  });

  it('maps invalid URL errors to PSIInvalidUrlError', async () => {
    safeFetchMock.mockResolvedValue({
      statusCode: 400,
      headers: {},
      body: JSON.stringify({
        error: { code: 400, message: 'Invalid URL: not-a-url' },
      }),
      finalUrl: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
      redirected: false,
      redirectChain: [],
    });
    const client = new PSIClient();

    const err = await client.fetch('https://example.com/', 'mobile').catch((e) => e);
    expect(err).toBeInstanceOf(PSIInvalidUrlError);
  });

  it('clears the cache on clearCache()', async () => {
    mockPSIResponse('psi-good.json');
    const client = new PSIClient({ cacheTTLMs: 60_000 });

    await client.fetch('https://example.com/', 'mobile');
    expect(client.getCacheStats().size).toBe(1);

    client.clearCache();
    expect(client.getCacheStats().size).toBe(0);

    await client.fetch('https://example.com/', 'mobile');
    expect(safeFetchMock).toHaveBeenCalledTimes(2);
  });

  it('propagates network failures (safeFetch rejection)', async () => {
    safeFetchMock.mockRejectedValue(new Error('Blocked: resolved to private IP'));
    const client = new PSIClient();

    await expect(client.fetch('https://example.com/', 'mobile')).rejects.toThrow(
      'Blocked: resolved to private IP'
    );
    expect(client.getCacheStats().size).toBe(0);
  });
});

describe('perf checks (findings)', () => {
  beforeEach(() => {
    safeFetchMock.mockReset();
    resetPSIClient();
  });

  it('good fixture: all 5 checks pass with info severity', async () => {
    mockPSIResponse('psi-good.json');
    const findings = await runPerfChecks('https://example.com/', {
      psiClient: new PSIClient({ apiKey: 'k' }),
    });

    // mobile: lcp, cls, inp + score_mobile; desktop: lcp, cls, inp + score_desktop
    expect(findings).toHaveLength(8);

    const ids = new Set(findings.map((f) => f.check_id));
    expect(ids).toContain(PERF_CHECKS.LCP);
    expect(ids).toContain(PERF_CHECKS.CLS);
    expect(ids).toContain(PERF_CHECKS.INP);
    expect(ids).toContain(PERF_CHECKS.SCORE_MOBILE);
    expect(ids).toContain(PERF_CHECKS.SCORE_DESKTOP);

    for (const f of findings) {
      expect(f.severity).toBe('info');
      expect(f.status).toBe('resolved');
      expect(f.confidence).toBe('observed');
      expect(() => FindingSchema.parse(f)).not.toThrow();
    }
  });

  it('needs-improvement fixture: low severity', async () => {
    mockPSIResponse('psi-needs-improvement.json');
    const findings = await runPerfChecks('https://example.com/', {
      psiClient: new PSIClient({ apiKey: 'k' }),
    });

    for (const f of findings) {
      expect(f.severity).toBe('low');
      expect(f.status).toBe('open');
      expect(() => FindingSchema.parse(f)).not.toThrow();
    }
  });

  it('poor fixture: medium severity, open status', async () => {
    mockPSIResponse('psi-poor.json');
    const findings = await runPerfChecks('https://example.com/', {
      psiClient: new PSIClient({ apiKey: 'k' }),
    });

    // mobile: lcp, cls, inp, score_mobile; desktop: lcp, cls, inp, score_desktop
    for (const f of findings) {
      expect(f.severity).toBe('medium');
      expect(f.status).toBe('open');
    }
  });

  it('missing metrics fixture: emits info findings with observed_value "unavailable"', async () => {
    mockPSIResponse('psi-missing-metrics.json');
    const findings = await runPerfChecks('https://example.com/', {
      psiClient: new PSIClient({ apiKey: 'k' }),
    });

    expect(findings).toHaveLength(8);
    for (const f of findings) {
      expect(f.evidence.observed_value).toBe('unavailable');
      expect(f.severity).toBe('info');
    }
  });

  it('quota error: each check gets a low-severity error finding, not a crash', async () => {
    mockPSIResponse('psi-quota-error.json', 429);
    const findings = await runPerfChecks('https://example.com/', {
      psiClient: new PSIClient({ apiKey: 'k' }),
    });

    expect(findings).toHaveLength(8);
    const lcpMobile = findings.find(
      (f) => f.check_id === PERF_CHECKS.LCP && f.evidence.response_meta?.['strategy'] === 'mobile'
    );
    expect(lcpMobile?.severity).toBe('low');
    expect(lcpMobile?.evidence.observed_value).toBe('quota_exceeded');
  });

  it('API key error: findings carry invalid_api_key and do not crash', async () => {
    mockPSIResponse('psi-api-key-error.json', 400);
    const findings = await runPerfChecks('https://example.com/', {
      psiClient: new PSIClient({ apiKey: 'k' }),
    });

    expect(findings).toHaveLength(8);
    const scoreMobile = findings.find(
      (f) => f.check_id === PERF_CHECKS.SCORE_MOBILE
    );
    expect(scoreMobile?.evidence.observed_value).toBe('invalid_api_key');
  });

  it('network/SRF rejection: findings carry the block reason', async () => {
    safeFetchMock.mockRejectedValue(new Error('Blocked: resolved to private IP'));
    const findings = await runPerfChecks('https://example.com/', {
      psiClient: new PSIClient(),
    });

    expect(findings).toHaveLength(8);
    const f = findings.find((x) => x.check_id === PERF_CHECKS.CLS);
    expect(String(f?.evidence.observed_value)).toMatch(/unknown_error|api_error/);
    // error message preserved in response_meta
    expect(f?.evidence.response_meta?.['error']).toContain('resolved to private IP');
  });

  it('every finding validates against FindingSchema and has a fingerprint', async () => {
    mockPSIResponse('psi-good.json');
    const findings = await runPerfChecks('https://example.com/', {
      psiClient: new PSIClient({ apiKey: 'k' }),
    });

    for (const f of findings) {
      const parsed = FindingSchema.parse(f);
      expect(parsed.fingerprint).toBeTruthy();
      expect(typeof parsed.fingerprint).toBe('string');
      expect(parsed.evidence.check_name).toBeTruthy();
    }
  });

  it('thresholds are configurable', async () => {
    mockPSIResponse('psi-needs-improvement.json');
    // With a stricter score threshold, 0.75 is now "medium" not "low"... actually >= 0.5 stays low.
    // Test custom LCP threshold instead: 3200 > 2500*1.0 default->low; with 1000ms threshold -> medium
    const config: PerfCheckConfig = {
      psiClient: new PSIClient({ apiKey: 'k' }),
      lcpThresholdMs: 1000,
      clsThreshold: 0.01,
      inpThresholdMs: 50,
      scoreThreshold: 0.9,
    };
    const findings = await runPerfChecks('https://example.com/', config);

    const lcpMobile = findings.find(
      (f) => f.check_id === PERF_CHECKS.LCP && f.evidence.response_meta?.['strategy'] === 'mobile'
    );
    expect(lcpMobile?.severity).toBe('medium');
    const clsMobile = findings.find(
      (f) => f.check_id === PERF_CHECKS.CLS && f.evidence.response_meta?.['strategy'] === 'mobile'
    );
    expect(clsMobile?.severity).toBe('medium');
    const inpMobile = findings.find(
      (f) => f.check_id === PERF_CHECKS.INP && f.evidence.response_meta?.['strategy'] === 'mobile'
    );
    expect(inpMobile?.severity).toBe('medium');
  });
});
