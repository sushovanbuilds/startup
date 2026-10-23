/**
 * Security posture checks - pure logic on collected evidence.
 *
 * Wording policy (FINDINGS-SPEC + task spec): findings say "observed" or
 * "needs review". Never "vulnerable", "insecure", "hacked", "exploit" or
 * "attack". Missing headers are low/medium "needs review", never alarms.
 *
 * Severity bias: under-report. All findings here are at most "medium".
 */
import { generateFingerprint, CHECK_NAMES, SECURITY_CHECKS, type Finding, type Evidence, type CheckId } from '@sitehealth/shared';

export const HSTS_RECOMMENDED_MAX_AGE = 31536000; // one year
export const TLS_WARN_DAYS = 30;

export interface SecurityEvidence {
  requestedUrl: string;
  /** ISO date of the check run. */
  checkedAt: string;
  /** HTTPS response observed by safe-fetch (initial, redirects not followed). */
  httpsStatus: number | null;
  /** Final URL of the HTTPS request after safe-fetch redirects. */
  httpsFinalUrl: string | null;
  /** HTTPS response headers (lowercased keys) from safe-fetch. */
  headers: Record<string, string>;
  /** HTTP (port 80) probe status without following redirects. */
  httpStatus: number | null;
  /** Location header observed on the HTTP probe if it redirected. */
  httpLocationHeader: string | null;
  /** Error if the HTTP probe failed entirely (e.g. port closed). */
  httpError: string | null;
  /** Error if the HTTPS fetch failed entirely. */
  httpsError: string | null;
  /** TLS certificate inspection result (null = not collected). */
  tls: {
    valid: boolean;
    /** Certificate not-after timestamp (ISO string) when valid. */
    validUntil: string | null;
    /** Reason TLS could not be used/validated. */
    error: string | null;
    issuer: string | null;
  } | null;
  /** TXT records for the registrable domain (SPF candidates). */
  spfTxtRecords: string[];
  /** TXT records at _dmarc.<domain> (DMARC candidates). */
  dmarcTxtRecords: string[];
}

function buildFinding(
  evidence: SecurityEvidence,
  checkId: CheckId,
  severity: 'info' | 'low' | 'medium' | 'high',
  observedValue: unknown,
  expected: unknown,
  responseMetaExtra?: Record<string, unknown>
): Finding {
  const ev: Evidence = {
    url: evidence.requestedUrl,
    observed_value: observedValue,
    expected,
    checked_at: evidence.checkedAt,
    check_name: CHECK_NAMES[checkId],
    response_meta: responseMetaExtra,
  };
  return {
    check_id: checkId,
    category: 'security',
    severity,
    status: severity === 'info' ? 'resolved' : 'open',
    confidence: 'observed',
    evidence: ev,
    fingerprint: generateFingerprint(checkId, evidence.requestedUrl, observedValue),
  };
}

/**
 * Confidence can never be observed when we could not gather evidence;
 * this variant marks the finding "untested" instead.
 */
function buildUntested(
  evidence: SecurityEvidence,
  checkId: CheckId,
  severity: 'info' | 'low' | 'medium' | 'high',
  observedValue: unknown,
  expected: unknown,
  responseMetaExtra?: Record<string, unknown>
): Finding {
  const f = buildFinding(evidence, checkId, severity, observedValue, expected, responseMetaExtra);
  f.confidence = 'untested';
  return f;
}

// ---------------------------------------------------------------------------
// sec.https_redirect
// ---------------------------------------------------------------------------
export function checkHttpsRedirect(e: SecurityEvidence): Finding {
  // HTTP probe could not be reached at all (common: port 80 closed).
  if (e.httpStatus === null) {
    if (e.httpsError !== null) {
      return buildUntested(e, SECURITY_CHECKS.HTTPS_REDIRECT, 'low', 'needs review', 'http requests redirect to https', {
        http_error: e.httpError,
        https_error: e.httpsError,
      });
    }
    // HTTPS worked and nothing decent listens on port 80: nothing to redirect
    return buildFinding(e, SECURITY_CHECKS.HTTPS_REDIRECT, 'info', 'http endpoint unavailable', 'http requests redirect to https');
  }
  const loc = e.httpLocationHeader;
  const redirectedToHttps = loc !== null && loc.toLowerCase().startsWith('https://');
  if (redirectedToHttps) {
    return buildFinding(e, SECURITY_CHECKS.HTTPS_REDIRECT, 'info', `redirect to ${loc}`, 'http requests redirect to https');
  }
  if (e.httpStatus >= 300 && e.httpStatus < 400 && loc !== null && !redirectedToHttps) {
    return buildFinding(e, SECURITY_CHECKS.HTTPS_REDIRECT, 'medium', `redirected to non-https location (${loc})`, 'http requests redirect to https');
  }
  if (e.httpStatus >= 300 && e.httpStatus < 400) {
    return buildFinding(e, SECURITY_CHECKS.HTTPS_REDIRECT, 'medium', 'redirect without Location header', 'http requests redirect to https');
  }
  return buildFinding(e, SECURITY_CHECKS.HTTPS_REDIRECT, 'medium', 'http responded directly', 'http requests redirect to https', { http_status: e.httpStatus });
}

// ---------------------------------------------------------------------------
// sec.tls_valid / sec.tls_expiry
// ---------------------------------------------------------------------------
export function checkTlsValid(e: SecurityEvidence): Finding {
  if (e.tls === null) {
    const reason = e.httpsError ?? 'tls inspection not collected';
    return buildUntested(e, SECURITY_CHECKS.TLS_VALID, 'low', 'needs review', 'valid TLS certificate', { reason });
  }
  if (e.tls.valid) {
    return buildFinding(e, SECURITY_CHECKS.TLS_VALID, 'info', 'valid certificate', 'valid TLS certificate', { issuer: e.tls.issuer ?? 'unknown' });
  }
  const certError = e.tls.error ?? 'unknown';
  // Distinguish handshake/cert problems from "could not connect" problems.
  if (/certificate|self.signed|expired|mismatch|authen/i.test(certError)) {
    return buildFinding(e, SECURITY_CHECKS.TLS_VALID, 'medium', `observed TLS issue: ${certError}`, 'valid TLS certificate');
  }
  return buildUntested(e, SECURITY_CHECKS.TLS_VALID, 'low', 'needs review', 'valid TLS certificate', { reason: certError });
}

export function checkTlsExpiry(e: SecurityEvidence): Finding {
  if (e.tls === null) {
    const reason = e.httpsError ?? 'tls inspection not collected';
    return buildUntested(e, SECURITY_CHECKS.TLS_EXPIRY, 'low', 'needs review', `${TLS_WARN_DAYS}+ days of validity remaining`, { reason });
  }
  if (!e.tls.valid) {
    return buildUntested(e, SECURITY_CHECKS.TLS_EXPIRY, 'low', 'needs review', `${TLS_WARN_DAYS}+ days of validity remaining`, {
      reason: 'certificate not valid; expiry check skipped',
    });
  }
  if (e.tls.validUntil === null) {
    return buildUntested(e, SECURITY_CHECKS.TLS_EXPIRY, 'low', 'needs review', `${TLS_WARN_DAYS}+ days of validity remaining`, { reason: 'expiry timestamp unavailable' });
  }
  const days = daysUntil(e.tls.validUntil, e.checkedAt);
  if (days === null) {
    return buildUntested(e, SECURITY_CHECKS.TLS_EXPIRY, 'low', 'needs review', `${TLS_WARN_DAYS}+ days of validity remaining`, { reason: 'expiry timestamp unparseable', valid_until: e.tls.validUntil });
  }
  if (days <= 0) {
    return buildFinding(e, SECURITY_CHECKS.TLS_EXPIRY, 'medium', `expired ${Math.abs(days)} day(s) ago`, `${TLS_WARN_DAYS}+ days of validity remaining`, { valid_until: e.tls.validUntil });
  }
  if (days <= TLS_WARN_DAYS) {
    return buildFinding(e, SECURITY_CHECKS.TLS_EXPIRY, 'low', `${days} day(s) remaining`, `${TLS_WARN_DAYS}+ days of validity remaining`, { valid_until: e.tls.validUntil });
  }
  return buildFinding(e, SECURITY_CHECKS.TLS_EXPIRY, 'info', `${days} day(s) remaining`, `${TLS_WARN_DAYS}+ days of validity remaining`, { valid_until: e.tls.validUntil });
}

export function daysUntil(isoDate: string, referenceIso: string): number | null {
  const then = Date.parse(isoDate);
  const now = Date.parse(referenceIso);
  if (Number.isNaN(then) || Number.isNaN(now)) return null;
  return Math.round((then - now) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Header checks
// ---------------------------------------------------------------------------
function headerValue(e: SecurityEvidence, name: string): string | null {
  const v = e.headers[name];
  if (v === undefined) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

export function checkHsts(e: SecurityEvidence): Finding {
  const hsts = headerValue(e, 'strict-transport-security');
  if (hsts === null) {
    return buildFinding(e, SECURITY_CHECKS.HSTS, 'low', 'header not sent', `Strict-Transport-Security with max-age >= ${HSTS_RECOMMENDED_MAX_AGE}`);
  }
  const extra: Record<string, unknown> = { header: hsts };
  if (/\bincludesubdomains\b/i.test(hsts)) extra.includeSubDomains = true;
  if (/\bpreload\b/i.test(hsts)) extra.preload = true;
  const maxAgeMatch = hsts.match(/max-age\s*=\s*"?(\d+)"?/i);
  if (!maxAgeMatch) {
    return buildFinding(e, SECURITY_CHECKS.HSTS, 'low', 'max-age missing or unparseable', `max-age >= ${HSTS_RECOMMENDED_MAX_AGE}`, extra);
  }
  const maxAge = parseInt(maxAgeMatch[1], 10);
  if (maxAge < HSTS_RECOMMENDED_MAX_AGE) {
    return buildFinding(e, SECURITY_CHECKS.HSTS, 'low', `max-age ${maxAge}`, `max-age >= ${HSTS_RECOMMENDED_MAX_AGE}`, extra);
  }
  return buildFinding(e, SECURITY_CHECKS.HSTS, 'info', `max-age ${maxAge}`, `max-age >= ${HSTS_RECOMMENDED_MAX_AGE}`, extra);
}

export function checkCsp(e: SecurityEvidence): Finding {
  const csp = headerValue(e, 'content-security-policy');
  if (csp === null) {
    if (headerValue(e, 'content-security-policy-report-only') !== null) {
      return buildFinding(e, SECURITY_CHECKS.CSP, 'low', 'report-only only', 'enforced Content-Security-Policy header');
    }
    return buildFinding(e, SECURITY_CHECKS.CSP, 'low', 'header not sent', 'enforced Content-Security-Policy header');
  }
  const extra: Record<string, unknown> = { header: csp };
  const unsafeDirectives: string[] = [];
  if (/unsafe-inline/.test(csp)) unsafeDirectives.push('unsafe-inline');
  if (/unsafe-eval/.test(csp)) unsafeDirectives.push('unsafe-eval');
  if (unsafeDirectives.length > 0) {
    extra.unsafe_directives = unsafeDirectives;
    return buildFinding(e, SECURITY_CHECKS.CSP, 'low', `observed ${unsafeDirectives.join(' and ')}`, 'Content-Security-Policy header present', extra);
  }
  return buildFinding(e, SECURITY_CHECKS.CSP, 'info', 'header present', 'enforced Content-Security-Policy header', extra);
}

export function checkXcto(e: SecurityEvidence): Finding {
  const xcto = headerValue(e, 'x-content-type-options');
  if (xcto === null) {
    return buildFinding(e, SECURITY_CHECKS.X_CONTENT_TYPE_OPTIONS, 'low', 'header not sent', 'nosniff');
  }
  if (xcto.toLowerCase() === 'nosniff') {
    return buildFinding(e, SECURITY_CHECKS.X_CONTENT_TYPE_OPTIONS, 'info', 'nosniff', 'nosniff');
  }
  return buildFinding(e, SECURITY_CHECKS.X_CONTENT_TYPE_OPTIONS, 'low', `observed value: ${xcto}`, 'nosniff');
}

export function checkReferrerPolicy(e: SecurityEvidence): Finding {
  const policy = headerValue(e, 'referrer-policy');
  if (policy === null) {
    return buildFinding(e, SECURITY_CHECKS.REFERRER_POLICY, 'low', 'header not sent', 'a restrictive Referrer-Policy');
  }
  const lower = policy.toLowerCase();
  if (lower === 'unsafe-url') {
    return buildFinding(e, SECURITY_CHECKS.REFERRER_POLICY, 'low', `observed policy: ${policy}`, 'a restrictive Referrer-Policy');
  }
  // Any other explicit policy (incl. the legacy default) counts as set.
  return buildFinding(e, SECURITY_CHECKS.REFERRER_POLICY, 'info', `policy set: ${policy}`, 'a restrictive Referrer-Policy');
}

export function checkFrameOptions(e: SecurityEvidence): Finding {
  const fo = headerValue(e, 'x-frame-options');
  if (fo === null) {
    // frame-ancestors in CSP covers the same ground; note it as context.
    const csp = headerValue(e, 'content-security-policy');
    const hasFrameAncestors = csp !== null && /frame-ancestors/i.test(csp);
    return buildFinding(e, SECURITY_CHECKS.FRAME_OPTIONS, 'low', 'header not sent', 'X-Frame-Options or CSP frame-ancestors', {
      csp_frame_ancestors: hasFrameAncestors,
    });
  }
  if (/^deny$/i.test(fo) || /^sameorigin$/i.test(fo)) {
    return buildFinding(e, SECURITY_CHECKS.FRAME_OPTIONS, 'info', fo, 'DENY or SAMEORIGIN');
  }
  return buildFinding(e, SECURITY_CHECKS.FRAME_OPTIONS, 'low', `observed legacy or invalid value: ${fo}`, 'DENY or SAMEORIGIN');
}

// ---------------------------------------------------------------------------
// sec.cookie_flags
// ---------------------------------------------------------------------------
export interface ParsedCookie {
  name: string;
  secure: boolean;
  httponly: boolean;
  samesite: boolean;
  raw: string;
}

/**
 * Split a merged Set-Cookie header value into individual cookie strings.
 * Cookies are separated by commas; comma-in-Expires keeps the same cookie,
 * so we split on a comma immediately followed by a token+equals pattern.
 */
export function splitCookies(merged: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < merged.length; i++) {
    const ch = merged[i];
    if (ch === ',' ) {
      const rest = merged.slice(i + 1);
      // A new cookie starts with an optional space then "name=".
      const newCookie = /^\s*[\w!#$%&'()*+\-./^`|~]+\s*=/.test(rest);
      if (newCookie) {
        parts.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim().length > 0) parts.push(current.trim());
  return parts;
}

export function parseCookieFlags(cookie: string): ParsedCookie | null {
  const nameMatch = cookie.match(/^[^=]+/);
  if (!nameMatch) return null;
  return {
    name: nameMatch[0].trim(),
    secure: /\bsecure\b/i.test(cookie),
    httponly: /\bhttponly\b/i.test(cookie),
    samesite: /\bsamesite\s*=/i.test(cookie),
    raw: cookie,
  };
}

export function checkCookieFlags(e: SecurityEvidence): Finding {
  const merged = headerValue(e, 'set-cookie');
  if (merged === null) {
    return buildFinding(e, SECURITY_CHECKS.COOKIE_FLAGS, 'info', 'no cookies observed', 'cookies with Secure and SameSite where set', { cookies: 0 });
  }
  const cookies = splitCookies(merged)
    .map(parseCookieFlags)
    .filter((c): c is ParsedCookie => c !== null);
  if (cookies.length === 0) {
    return buildUntested(e, SECURITY_CHECKS.COOKIE_FLAGS, 'low', 'needs review', 'cookies with Secure and SameSite where set', { reason: 'set-cookie header unparseable' });
  }
  const withoutSecure = cookies.filter((c) => !c.secure).map((c) => c.name);
  const withoutSameSite = cookies.filter((c) => !c.samesite).map((c) => c.name);
  const withoutHttpOnly = cookies.filter((c) => !c.httponly).map((c) => c.name);
  const observed = JSON.stringify({
    cookies: cookies.length,
    without_secure: withoutSecure,
    without_samesite: withoutSameSite,
    without_httponly: withoutHttpOnly,
  });
  const extra = {
    cookies: cookies.length,
    without_secure: withoutSecure,
    without_samesite: withoutSameSite,
    without_httponly: withoutHttpOnly,
  };
  if (withoutSecure.length > 0 || withoutSameSite.length > 0) {
    return buildFinding(e, SECURITY_CHECKS.COOKIE_FLAGS, 'low', observed, 'cookies with Secure and SameSite where set', extra);
  }
  return buildFinding(e, SECURITY_CHECKS.COOKIE_FLAGS, 'info', observed, 'cookies with Secure and SameSite where set', extra);
}

// ---------------------------------------------------------------------------
// sec.spf / sec.dmarc (DNS TXT records passed in as strings)
// ---------------------------------------------------------------------------
export function checkSpf(e: SecurityEvidence): Finding {
  const records = e.spfTxtRecords.filter((r) => /^v=spf1(\s|$)/i.test(r.trim()));
  if (records.length === 0) {
    const anyTxt = e.spfTxtRecords.length > 0;
    return buildFinding(
      e,
      SECURITY_CHECKS.SPF,
      'low',
      e.spfTxtRecords.length === 0 ? 'no TXT records observed' : `TXT records exist but none start with v=spf1 (${e.spfTxtRecords.length})`,
      'an SPF record',
      { txt_count: e.spfTxtRecords.length, has_other_txt: anyTxt }
    );
  }
  if (records.length > 1) {
    return buildFinding(e, SECURITY_CHECKS.SPF, 'low', `observed ${records.length} v=spf1 records`, 'exactly one SPF record', { count: records.length });
  }
  const spf = records[0];
  const allRecords = spf.match(/(^|\s)([+\-~?])all(\s|$)/i);
  if (allRecords) {
    const qualifier = allRecords[2];
    if (qualifier === '+') {
      // "+all" allows any sender; observable from the record text.
      return buildFinding(e, SECURITY_CHECKS.SPF, 'medium', 'observed +all in SPF record', 'SPF record present', { spf });
    }
    if (qualifier === '?') {
      return buildFinding(e, SECURITY_CHECKS.SPF, 'low', 'observed ?all in SPF record', 'SPF record present', { spf });
    }
  }
  return buildFinding(e, SECURITY_CHECKS.SPF, 'info', 'SPF record present', 'an SPF record', { spf });
}

export function checkDmarc(e: SecurityEvidence): Finding {
  const records = e.dmarcTxtRecords.filter((r) => /^v=DMARC1(\s|;|$)/i.test(r.trim()));
  if (records.length === 0) {
    return buildFinding(e, SECURITY_CHECKS.DMARC, 'low', 'no DMARC record observed', 'a DMARC record at _dmarc.<domain>', { txt_count: e.dmarcTxtRecords.length });
  }
  const dmarc = records[0];
  const pMatch = dmarc.match(/;\s*p=(none|quarantine|reject)\b/i) || dmarc.match(/\bp=(none|quarantine|reject)\b/i);
  if (!pMatch) {
    return buildFinding(e, SECURITY_CHECKS.DMARC, 'low', 'DMARC record without p= tag', 'a DMARC record', { dmarc });
  }
  return buildFinding(e, SECURITY_CHECKS.DMARC, 'info', `observed policy p=${pMatch[1]}`, 'a DMARC record', { dmarc });
}

/**
 * Run all 11 security checks on gathered evidence.
 */
export function runSecurityChecks(e: SecurityEvidence): Finding[] {
  return [
    checkHttpsRedirect(e),
    checkTlsValid(e),
    checkTlsExpiry(e),
    checkHsts(e),
    checkCsp(e),
    checkXcto(e),
    checkReferrerPolicy(e),
    checkFrameOptions(e),
    checkCookieFlags(e),
    checkSpf(e),
    checkDmarc(e),
  ];
}
