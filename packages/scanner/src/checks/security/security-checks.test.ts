/**
 * Fixture-based tests for security posture checks.
 * - Pure-logic: each check gets pass / fail / edge fixtures (JSON header sets).
 * - Delivery layers (safe-fetch, TLS, DNS TXT) are fully mocked; no live calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FindingSchema, SECURITY_CHECKS } from '@sitehealth/shared';

// Mock safe-fetch before importing modules that use it.
const { safeFetchMock } = vi.hoisted(() => ({ safeFetchMock: vi.fn() }));
// Mock the tls module: safe-fetch is itself mocked in this file, so the
// only tls.connect caller is tls-probe.
const { tlsConnectMock } = vi.hoisted(() => ({ tlsConnectMock: vi.fn() }));

vi.mock('../../net/safe-fetch', () => ({
  safeFetch: safeFetchMock,
  validateFetchUrl: vi.fn(async (url: string) => {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return { valid: false, error: 'Only HTTP and HTTPS' };
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL' };
    }
  }),
  resolveHostname: vi.fn(async () => ['93.184.216.34']),
  setResolverForTesting: vi.fn(),
}));

vi.mock('tls', () => ({ connect: tlsConnectMock }));

import { validateFetchUrl } from '../../net/safe-fetch';
import {
  splitCookies,
  parseCookieFlags,
  daysUntil,
  runSecurityChecks,
  checkHttpsRedirect,
  checkTlsValid,
  checkTlsExpiry,
  checkHsts,
  checkCsp,
  checkXcto,
  checkReferrerPolicy,
  checkFrameOptions,
  checkCookieFlags,
  checkSpf,
  checkDmarc,
  HSTS_RECOMMENDED_MAX_AGE,
  type SecurityEvidence,
} from './security-checks';
import { getTxtRecords, setTxtResolverForTesting, resetTxtResolver } from './dns-records';
import { inspectTls } from './tls-probe';
import { collectSecurityEvidence } from './collect';

const FIXTURES = join(__dirname, '__fixtures__');
type HeaderSet = Record<string, string>;
const HEADER_FIXTURES: Record<string, HeaderSet> = JSON.parse(
  readFileSync(join(FIXTURES, 'header-sets.json'), 'utf8')
);

const NOW = '2026-10-23T00:00:00.000Z';

function baseEvidence(overrides: Partial<SecurityEvidence> = {}): SecurityEvidence {
  return {
    requestedUrl: 'https://example.test/',
    checkedAt: NOW,
    httpsStatus: 200,
    httpsFinalUrl: 'https://example.test/',
    headers: {
      'strict-transport-security': `max-age=${HSTS_RECOMMENDED_MAX_AGE}`,
      'content-security-policy': "default-src 'self'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-frame-options': 'DENY',
      'set-cookie': 'a=1; Secure; HttpOnly; SameSite=Strict',
    },
    httpStatus: 301,
    httpLocationHeader: 'https://example.test/',
    httpError: null,
    httpsError: null,
    tls: { valid: true, validUntil: '2027-01-20T00:00:00.000Z', error: null, issuer: 'Example CA' },
    spfTxtRecords: ['v=spf1 include:_spf.provider.test -all'],
    dmarcTxtRecords: ['v=DMARC1; p=quarantine; rua=mailto:dmarc@example.test'],
    ...overrides,
  };
}

// Fake TLS socket for tls-probe tests.
function mockTlsSocket(behavior:
  | { kind: 'ok'; validUntil: Date; issuer: string }
  | { kind: 'error'; message: string }
  | { kind: 'timeout' }): { handlers: Record<string, Array<(arg?: unknown) => void>> } {
  const handlers: Record<string, Array<(arg?: unknown) => void>> = {};
  const socket = {
    authorized: behavior.kind === 'ok',
    authorizationError: undefined as unknown,
    getPeerCertificate() {
      return behavior.kind === 'ok'
        ? { valid_to_date: behavior.validUntil, issuer: { O: behavior.issuer } }
        : {};
    },
    once(event: string, cb: () => void) {
      (handlers[event] ??= []).push(cb);
    },
    destroy() { /* noop */ },
    fired: false,
  };
  tlsConnectMock.mockImplementation(() => socket);
  // Fire exactly one lifecycle event asynchronously.
  setTimeout(() => {
    if (behavior.kind === 'ok') handlers['secureConnect']?.forEach((cb) => cb());
    else if (behavior.kind === 'error') handlers['error']?.forEach((cb) => cb(new Error(behavior.message)));
    else handlers['timeout']?.forEach((cb) => cb());
  }, 0);
  return { handlers };
}

// ---------------------------------------------------------------------------
// Wording policy: the whole catalog must be free of alarmist language.
// ---------------------------------------------------------------------------
describe('wording policy (all checks, all fixture variants)', () => {
  const forbidden = ['vulnerab', 'insecure', 'hacked', 'exploit', 'attack', 'danger'];
  const evidenceVariants = [
    baseEvidence(),
    baseEvidence({ headers: HEADER_FIXTURES['weak_everything'] }),
    baseEvidence({ headers: {}, tls: null, httpsError: 'connect refused', spfTxtRecords: [], dmarcTxtRecords: [], httpStatus: null }),
    baseEvidence({ tls: { valid: false, validUntil: null, error: 'certificate has expired', issuer: null } }),
    baseEvidence({ spfTxtRecords: ['v=spf1 +all'] }),
  ];
  it('never contains vulnerable/insecure/hacked/exploit wording', () => {
    for (const e of evidenceVariants) {
      for (const f of runSecurityChecks(e)) {
        const text = JSON.stringify(f).toLowerCase();
        for (const word of forbidden) {
          expect(text).not.toContain(word);
        }
      }
    }
  });
  it('every finding validates against FindingSchema', () => {
    for (const f of runSecurityChecks(baseEvidence())) {
      const parsed = FindingSchema.parse(f);
      expect(parsed.check_id).toBeTruthy();
      expect(parsed.fingerprint).toBeTruthy();
      expect(parsed.category).toBe('security');
    }
  });
  it('produces exactly the eleven check ids', () => {
    const ids = runSecurityChecks(baseEvidence()).map((f) => f.check_id);
    expect(ids).toHaveLength(11);
    for (const id of Object.values(SECURITY_CHECKS)) {
      expect(ids).toContain(id);
    }
  });
  it('severity never exceeds medium (under-reporting bias)', () => {
    for (const e of evidenceVariants) {
      for (const f of runSecurityChecks(e)) {
        expect(['info', 'low', 'medium']).toContain(f.severity);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// sec.https_redirect
// ---------------------------------------------------------------------------
describe('sec.https_redirect', () => {
  it('pass: http 301 -> https Location (info/resolved)', () => {
    const f = checkHttpsRedirect(baseEvidence());
    expect(f.severity).toBe('info');
    expect(f.status).toBe('resolved');
  });
  it('pass: any 3xx with https location counts (308)', () => {
    const f = checkHttpsRedirect(baseEvidence({ httpStatus: 308, httpLocationHeader: 'https://example.test/home/' }));
    expect(f.severity).toBe('info');
  });
  it('fail: http answers 200 directly without redirect (medium)', () => {
    const f = checkHttpsRedirect(baseEvidence({ httpStatus: 200, httpLocationHeader: null }));
    expect(f.severity).toBe('medium');
  });
  it('fail: redirects elsewhere over http (medium)', () => {
    const f = checkHttpsRedirect(baseEvidence({ httpStatus: 302, httpLocationHeader: 'http://example.test/moved' }));
    expect(f.severity).toBe('medium');
  });
  it('edge: 3xx without Location header (medium)', () => {
    const f = checkHttpsRedirect(baseEvidence({ httpStatus: 302, httpLocationHeader: null }));
    expect(f.severity).toBe('medium');
  });
  it('edge: port 80 closed (http probe error) with working https -> info', () => {
    const f = checkHttpsRedirect(baseEvidence({ httpStatus: null, httpError: 'connect refused', httpsError: null }));
    expect(f.severity).toBe('info');
    expect(f.evidence.observed_value).toBe('http endpoint unavailable');
  });
  it('edge: both probes failed -> untested needs review', () => {
    const f = checkHttpsRedirect(baseEvidence({ httpStatus: null, httpError: 'refused', httpsError: 'refused' }));
    expect(f.severity).toBe('low');
    expect(f.confidence).toBe('untested');
  });
});

// ---------------------------------------------------------------------------
// sec.tls_valid / sec.tls_expiry
// ---------------------------------------------------------------------------
describe('sec.tls_valid', () => {
  it('pass: valid certificate', () => {
    const f = checkTlsValid(baseEvidence());
    expect(f.severity).toBe('info');
  });
  it('fail: certificate error observed (medium)', () => {
    const f = checkTlsValid(baseEvidence({ tls: { valid: false, validUntil: null, error: 'self-signed certificate', issuer: null } }));
    expect(f.severity).toBe('medium');
  });
  it('edge: connect refused (not a cert problem) -> untested needs review', () => {
    const f = checkTlsValid(baseEvidence({ tls: { valid: false, validUntil: null, error: 'ECONNREFUSED 93.184.216.34:443', issuer: null } }));
    expect(f.severity).toBe('low');
    expect(f.confidence).toBe('untested');
  });
  it('edge: no TLS evidence at all -> untested', () => {
    const f = checkTlsValid(baseEvidence({ tls: null }));
    expect(f.severity).toBe('low');
    expect(f.confidence).toBe('untested');
  });
});

describe('sec.tls_expiry', () => {
  it('pass: > 30 days remaining (info)', () => {
    const f = checkTlsExpiry(baseEvidence());
    expect(f.severity).toBe('info');
    expect(String(f.evidence.observed_value)).toContain('day');
  });
  it('fail: expired (medium)', () => {
    const f = checkTlsExpiry(baseEvidence({ tls: { valid: true, validUntil: '2026-10-01T00:00:00.000Z', error: null, issuer: null } }));
    expect(f.severity).toBe('medium');
  });
  it('edge: 20 days remaining -> low', () => {
    const f = checkTlsExpiry(baseEvidence({ tls: { valid: true, validUntil: '2026-11-12T00:00:00.000Z', error: null, issuer: null } }));
    expect(f.severity).toBe('low');
  });
  it('edge: invalid cert -> expiry skipped, untested', () => {
    const f = checkTlsExpiry(baseEvidence({ tls: { valid: false, validUntil: null, error: 'hostname mismatch', issuer: null } }));
    expect(f.severity).toBe('low');
    expect(f.confidence).toBe('untested');
  });
  it('daysUntil math', () => {
    expect(daysUntil('2026-10-24T00:00:00.000Z', NOW)).toBe(1);
    expect(daysUntil('2026-10-22T00:00:00.000Z', NOW)).toBe(-1);
    expect(daysUntil('garbage', NOW)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Header checks from JSON fixtures
// ---------------------------------------------------------------------------
describe('sec.hsts', () => {
  it('pass: max-age >= 1y (fixture all_good)', () => {
    const f = checkHsts(baseEvidence({ headers: HEADER_FIXTURES['all_good'] }));
    expect(f.severity).toBe('info');
    expect(f.evidence.response_meta?.['includeSubDomains']).toBe(true);
    expect(f.evidence.response_meta?.['preload']).toBe(true);
  });
  it('fail: header not sent (fixture none_sent)', () => {
    const f = checkHsts(baseEvidence({ headers: HEADER_FIXTURES['none_sent'] }));
    expect(f.severity).toBe('low');
    expect(f.evidence.observed_value).toBe('header not sent');
  });
  it('edge: short max-age (fixture weak_everything) -> low', () => {
    const f = checkHsts(baseEvidence({ headers: HEADER_FIXTURES['weak_everything'] }));
    expect(f.severity).toBe('low');
  });
  it('edge: unparseable value -> low', () => {
    const f = checkHsts(baseEvidence({ headers: { 'strict-transport-security': 'banana' } }));
    expect(f.severity).toBe('low');
  });
});

describe('sec.csp', () => {
  it('pass: CSP present without unsafe directives (fixture all_good)', () => {
    const f = checkCsp(baseEvidence({ headers: HEADER_FIXTURES['all_good'] }));
    expect(f.severity).toBe('info');
  });
  it('fail: header not sent', () => {
    const f = checkCsp(baseEvidence({ headers: {} }));
    expect(f.severity).toBe('low');
  });
  it('edge: unsafe-inline/unsafe-eval -> low needs review, not an alarm', () => {
    const f = checkCsp(baseEvidence({ headers: HEADER_FIXTURES['weak_everything'] }));
    expect(f.severity).toBe('low');
    expect(JSON.stringify(f.evidence)).toContain('unsafe-inline');
  });
  it('edge: report-only only -> low', () => {
    const f = checkCsp(baseEvidence({ headers: HEADER_FIXTURES['report_only_csp'] }));
    expect(f.severity).toBe('low');
    expect(f.evidence.observed_value).toBe('report-only only');
  });
});

describe('sec.xcto', () => {
  it('pass: nosniff', () => {
    expect(checkXcto(baseEvidence({ headers: HEADER_FIXTURES['all_good'] })).severity).toBe('info');
  });
  it('fail: not sent', () => {
    const f = checkXcto(baseEvidence({ headers: {} }));
    expect(f.severity).toBe('low');
    expect(f.evidence.observed_value).toBe('header not sent');
  });
  it('edge: unrelated value -> low', () => {
    expect(checkXcto(baseEvidence({ headers: HEADER_FIXTURES['weak_everything'] })).severity).toBe('low');
  });
});

describe('sec.referrer_policy', () => {
  it('pass: strict-origin-when-cross-origin', () => {
    expect(checkReferrerPolicy(baseEvidence({ headers: HEADER_FIXTURES['all_good'] })).severity).toBe('info');
  });
  it('fail: not sent', () => {
    expect(checkReferrerPolicy(baseEvidence({ headers: {} })).severity).toBe('low');
  });
  it('edge: unsafe-url -> low needs review (not alarming wording)', () => {
    const f = checkReferrerPolicy(baseEvidence({ headers: HEADER_FIXTURES['weak_everything'] }));
    expect(f.severity).toBe('low');
    expect(f.evidence.observed_value).toContain('observed policy');
  });
});

describe('sec.frame_options', () => {
  it('pass: DENY', () => {
    expect(checkFrameOptions(baseEvidence({ headers: HEADER_FIXTURES['all_good'] })).severity).toBe('info');
  });
  it('fail: not sent and no frame-ancestors -> low with context', () => {
    const f = checkFrameOptions(baseEvidence({ headers: {} }));
    expect(f.severity).toBe('low');
    expect(f.evidence.response_meta?.['csp_frame_ancestors']).toBe(false);
  });
  it('edge: not sent but CSP frame-ancestors covers it (still low, context noted)', () => {
    const f = checkFrameOptions(baseEvidence({ headers: HEADER_FIXTURES['frame_ancestors_instead'] }));
    expect(f.severity).toBe('low');
    expect(f.evidence.response_meta?.['csp_frame_ancestors']).toBe(true);
  });
  it('edge: ALLOW-FROM (deprecated) -> low', () => {
    const f = checkFrameOptions(baseEvidence({ headers: { 'x-frame-options': 'ALLOW-FROM https://embedder.test' } }));
    expect(f.severity).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// sec.cookie_flags
// ---------------------------------------------------------------------------
describe('cookie parsing helpers', () => {
  it('splitCookies keeps comma-in-Expires inside a cookie', () => {
    const parts = splitCookies(HEADER_FIXTURES['multiple_cookies']['set-cookie']);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toContain('Expires=Wed, 21 Oct 2026 07:28:00 GMT');
    expect(parts[2]).toContain('Expires=Thu, 22 Oct 2026 07:28:00 GMT');
  });
  it('parseCookieFlags extracts flags', () => {
    const c = parseCookieFlags('sid=x; Path=/; Secure; HttpOnly; SameSite=Lax');
    expect(c?.secure).toBe(true);
    expect(c?.httponly).toBe(true);
    expect(c?.samesite).toBe(true);
    expect(c?.name).toBe('sid');
  });
});

describe('sec.cookie_flags', () => {
  it('pass: all cookies carry Secure + SameSite (multiple_cookies fixture) -> info', () => {
    const f = checkCookieFlags(baseEvidence({ headers: HEADER_FIXTURES['multiple_cookies'] }));
    expect(f.severity).toBe('info');
  });
  it('fail: cookie without flags (mixed_flags fixture) -> low', () => {
    const f = checkCookieFlags(baseEvidence({ headers: HEADER_FIXTURES['mixed_flags'] }));
    expect(f.severity).toBe('low');
    const observed = JSON.parse(String(f.evidence.observed_value));
    expect(observed.cookies).toBe(2);
    expect(observed.without_secure).toContain('b');
    expect(observed.without_samesite).toContain('b');
  });
  it('edge: no set-cookie at all -> info (nothing observed)', () => {
    const f = checkCookieFlags(baseEvidence({ headers: HEADER_FIXTURES['none_sent'] }));
    expect(f.severity).toBe('info');
    expect(f.evidence.observed_value).toBe('no cookies observed');
  });
  it('edge: HttpOnly missing but Secure+SameSite present -> info (HttpOnly noted in evidence)', () => {
    const f = checkCookieFlags(baseEvidence({ headers: { 'set-cookie': 'a=1; Secure; SameSite=Strict' } }));
    expect(f.severity).toBe('info');
    expect((f.evidence.response_meta as Record<string, unknown>)['without_httponly']).toEqual(['a']);
  });
});

// ---------------------------------------------------------------------------
// sec.spf / sec.dmarc
// ---------------------------------------------------------------------------
describe('sec.spf', () => {
  it('pass: SPF record with hard/soft fail -> info', () => {
    expect(checkSpf(baseEvidence()).severity).toBe('info');
    expect(checkSpf(baseEvidence({ spfTxtRecords: ['v=spf1 ~all'] })).severity).toBe('info');
  });
  it('fail: no TXT records -> low needs review (not an alarm)', () => {
    const f = checkSpf(baseEvidence({ spfTxtRecords: [] }));
    expect(f.severity).toBe('low');
    expect(f.evidence.observed_value).toBe('no TXT records observed');
  });
  it('fail: TXT records exist but none are SPF -> low', () => {
    const f = checkSpf(baseEvidence({ spfTxtRecords: ['v=spf10 something', 'some-random-txt'] }));
    expect(f.severity).toBe('low');
  });
  it('edge: +all -> medium (observed from record text)', () => {
    const f = checkSpf(baseEvidence({ spfTxtRecords: ['v=spf1 +all'] }));
    expect(f.severity).toBe('medium');
    expect(f.evidence.observed_value).toContain('+all');
  });
  it('edge: ?all -> low', () => {
    expect(checkSpf(baseEvidence({ spfTxtRecords: ['v=spf1 ?all'] })).severity).toBe('low');
  });
  it('edge: multiple v=spf1 records -> low', () => {
    const f = checkSpf(baseEvidence({ spfTxtRecords: ['v=spf1 -all', 'v=spf1 mx -all'] }));
    expect(f.severity).toBe('low');
  });
});

describe('sec.dmarc', () => {
  it('pass: p=quarantine / p=reject -> info', () => {
    expect(checkDmarc(baseEvidence()).severity).toBe('info');
    expect(checkDmarc(baseEvidence({ dmarcTxtRecords: ['v=DMARC1; p=reject'] })).severity).toBe('info');
  });
  it('fail: no DMARC records -> low needs review', () => {
    const f = checkDmarc(baseEvidence({ dmarcTxtRecords: [] }));
    expect(f.severity).toBe('low');
  });
  it('edge: p=none -> info (monitoring-only policy observed) and never alarmed', () => {
    const f = checkDmarc(baseEvidence({ dmarcTxtRecords: ['v=DMARC1; p=none'] }));
    expect(f.severity).toBe('info');
    expect(f.evidence.observed_value).toContain('p=none');
  });
  it('edge: record without p= tag -> low', () => {
    expect(checkDmarc(baseEvidence({ dmarcTxtRecords: ['v=DMARC1; rua=mailto:x@y.test'] })).severity).toBe('low');
  });
  it('pass: p=none with space-separated form parsed', () => {
    expect(checkDmarc(baseEvidence({ dmarcTxtRecords: ['v=DMARC1 p=none'] })).severity).toBe('info');
  });
});

// ---------------------------------------------------------------------------
// Delivery layers: DNS TXT + TLS probe (all mocked; no live calls)
// ---------------------------------------------------------------------------
describe('dns-records', () => {
  afterEach(() => resetTxtResolver());

  it('flattens record chunks and returns error null', async () => {
    setTxtResolverForTesting(async () => [['v=spf1', ' include:', '_spf.x.test'], ['random']]);
    const result = await getTxtRecords('example.test');
    expect(result.records).toEqual(['v=spf1 include:_spf.x.test', 'random']);
    expect(result.error).toBeNull();
  });
  it('treats ENODATA as records empty / error null', async () => {
    setTxtResolverForTesting(async () => {
      const err = new Error('no data') as { code?: string };
      err.code = 'ENODATA';
      throw err;
    });
    const result = await getTxtRecords('example.test');
    expect(result).toEqual({ records: [], error: null });
  });
  it('surfaces other errors without throwing', async () => {
    setTxtResolverForTesting(async () => {
      throw new Error('timeout talking to nameserver');
    });
    const result = await getTxtRecords('example.test');
    expect(result.error).toContain('timeout');
  });
});

describe('tls-probe (safe-fetch validation + tls mocked)', () => {
  it('fails closed on safe-fetch validation failure (SSRF guard)', async () => {
    vi.mocked(validateFetchUrl).mockImplementationOnce(async () => ({
      valid: false,
      error: 'Resolves to private IP: 10.0.0.1',
    }));
    const result = await inspectTls('https://example.test/');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('private IP');
    // TLS connect must never have been attempted
    expect(tlsConnectMock).not.toHaveBeenCalled();
  });

  it('reports a valid certificate on success', async () => {
    mockTlsSocket({ kind: 'ok', validUntil: new Date('2027-01-20T00:00:00.000Z'), issuer: 'Example CA' });
    const result = await inspectTls('https://example.test/');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    expect(result.issuer).toBe('Example CA');
    expect(result.validUntil).toBe('2027-01-20T00:00:00.000Z');
    // SNI uses the hostname, connection pins the resolver's IP
    expect(tlsConnectMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: '93.184.216.34', servername: 'example.test', port: 443 })
    );
  });

  it('reports handshake errors without throwing', async () => {
    mockTlsSocket({ kind: 'error', message: 'certificate has expired' });
    const result = await inspectTls('https://example.test/');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('certificate has expired');
  });

  it('reports timeouts without throwing', async () => {
    mockTlsSocket({ kind: 'timeout' });
    const result = await inspectTls('https://example.test/');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('TLS handshake timeout');
  });
});

// ---------------------------------------------------------------------------
// collectSecurityEvidence (safe-fetch, tls, dns all mocked)
// ---------------------------------------------------------------------------
describe('collectSecurityEvidence', () => {
  beforeEach(() => {
    safeFetchMock.mockReset();
    tlsConnectMock.mockReset();
  });
  afterEach(() => resetTxtResolver());

  function mockTxt() {
    setTxtResolverForTesting(async (host: string) => {
      if (host === 'example.test') return [['v=spf1', ' -all']];
      if (host === '_dmarc.example.test') return [['v=DMARC1; p=none']];
      return [];
    });
  }

  it('assembles evidence from https probe, http first hop, tls, and TXT', async () => {
    mockTxt();
    safeFetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('https://')) {
        return { statusCode: 200, headers: { 'content-type': 'text/html', 'x-content-type-options': 'nosniff' }, body: '<html></html>', finalUrl: 'https://example.test/', redirected: false, redirectChain: [] };
      }
      return { statusCode: 301, headers: { location: 'https://example.test/' }, body: '', finalUrl: 'http://example.test/', redirected: false, redirectChain: [] };
    });
    mockTlsSocket({ kind: 'ok', validUntil: new Date('2027-01-20T00:00:00.000Z'), issuer: 'Example CA' });

    const evidence = await collectSecurityEvidence('example.test');
    expect(evidence.requestedUrl).toBe('https://example.test/');
    expect(evidence.httpsStatus).toBe(200);
    expect(evidence.headers['x-content-type-options']).toBe('nosniff');
    expect(evidence.httpStatus).toBe(301);
    expect(evidence.httpLocationHeader).toBe('https://example.test/');
    expect(evidence.tls?.valid).toBe(true);
    expect(evidence.spfTxtRecords).toEqual(['v=spf1 -all']);
    expect(evidence.dmarcTxtRecords).toEqual(['v=DMARC1; p=none']);
    // exactly two HTTP probes: https + http first hop
    expect(safeFetchMock.mock.calls.length).toBe(2);
  });

  it('http probe uses maxRedirects 0 (first hop only)', async () => {
    mockTxt();
    safeFetchMock.mockImplementation(async () => ({
      statusCode: 301, headers: { location: 'https://example.test/' }, body: '', finalUrl: 'http://example.test/', redirected: false, redirectChain: [],
    }));
    mockTlsSocket({ kind: 'ok', validUntil: new Date('2027-01-20T00:00:00.000Z'), issuer: 'Example CA' });

    await collectSecurityEvidence('https://example.test/');
    const httpCall = safeFetchMock.mock.calls.find((c) => String(c[0]).startsWith('http://'));
    expect(httpCall?.[1]).toMatchObject({ maxRedirects: 0 });
  });

  it('records probe errors without throwing; checks still produce the full catalog', async () => {
    safeFetchMock.mockRejectedValue(new Error('connect refused'));
    const evidence = await collectSecurityEvidence('https://example.test/');
    expect(evidence.httpsError).toContain('refused');
    expect(evidence.httpError).toContain('refused');
    expect(evidence.httpsStatus).toBeNull();

    const findings = runSecurityChecks(evidence);
    expect(findings).toHaveLength(11);
    for (const f of findings) {
      expect(() => FindingSchema.parse(f)).not.toThrow();
      // With evidence absent, everything under-reports: low or info only.
      expect(['info', 'low']).toContain(f.severity);
    }
  });
});
