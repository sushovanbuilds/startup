/**
 * Evidence collector for security checks.
 * All network access goes through safe-fetch (hard rule 1); TLS inspection
 * goes through tls-probe (which itself validates via safe-fetch primitives);
 * DNS TXT lookups go through dns-records.
 */
import { safeFetch } from '../../net/safe-fetch';
import { inspectTls, type TlsProbeResult } from './tls-probe';
import { getTxtRecords } from './dns-records';
import { runSecurityChecks, type SecurityEvidence } from './security-checks';
import type { Finding } from '@sitehealth/shared';

export interface CollectOptions {
  /** Per-request timeout in ms passed down to safe-fetch (default 10s). */
  requestTimeoutMs?: number;
}

/**
 * Assemble SecurityEvidence for a target URL:
 *  1. https:// fetch (redirects followed) -> headers + final URL
 *  2. http:// fetch (maxRedirects 0)     -> first-hop status + Location
 *  3. TLS handshake inspection           -> cert validity + expiry
 *  4. DNS TXT for hostname and _dmarc.<host>
 */
export async function collectSecurityEvidence(
  targetUrl: string,
  options: CollectOptions = {}
): Promise<SecurityEvidence> {
  const timeoutMs = options.requestTimeoutMs ?? 10_000;

  const httpTarget = toHttp(targetUrl);
  const httpsTarget = toHttps(targetUrl);

  const evidence: SecurityEvidence = {
    requestedUrl: httpsTarget,
    checkedAt: new Date().toISOString(),
    httpsStatus: null,
    httpsFinalUrl: null,
    headers: {},
    httpStatus: null,
    httpLocationHeader: null,
    httpError: null,
    httpsError: null,
    tls: null,
    spfTxtRecords: [],
    dmarcTxtRecords: [],
  };

  // HTTP and HTTPS probes are independent; TXT is independent of both.
  type HttpOutcome = { error: string } | Awaited<ReturnType<typeof safeFetch>>;
  const httpsProbe = (async (): Promise<HttpOutcome> => {
    try {
      return await safeFetch(httpsTarget, { requestTimeoutMs: timeoutMs });
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  })();
  const httpProbe = (async (): Promise<HttpOutcome> => {
    try {
      return await safeFetch(httpTarget, { requestTimeoutMs: timeoutMs, maxRedirects: 0 });
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  })();
  const tlsProbe = (async (): Promise<TlsProbeResult> => {
    try {
      return await inspectTls(httpsTarget, timeoutMs);
    } catch (error) {
      return {
        valid: false,
        validUntil: null,
        error: error instanceof Error ? error.message : 'TLS inspection failed',
        issuer: null,
      };
    }
  })();
  const spfProbe = (async () => {
    try {
      return await getTxtRecords(hostnameOf(httpsTarget));
    } catch (error) {
      return { records: [], error: error instanceof Error ? error.message : 'TXT failed' };
    }
  })();
  const dmarcProbe = (async () => {
    try {
      return await getTxtRecords(`_dmarc.${hostnameOf(httpsTarget)}`);
    } catch (error) {
      return { records: [], error: error instanceof Error ? error.message : 'TXT failed' };
    }
  })();

  const [httpsResult, httpResult, tlsResult, spfResult, dmarcResult] =
    await Promise.all([httpsProbe, httpProbe, tlsProbe, spfProbe, dmarcProbe]);

  // HTTPS probe
  if ('error' in httpsResult) {
    evidence.httpsError = httpsResult.error;
  } else {
    evidence.httpsStatus = httpsResult.statusCode;
    evidence.headers = httpsResult.headers;
    evidence.httpsFinalUrl = httpsResult.finalUrl;
  }

  // HTTP probe (first hop only)
  if ('error' in httpResult) {
    evidence.httpError = httpResult.error;
  } else {
    evidence.httpStatus = httpResult.statusCode;
    evidence.httpLocationHeader = httpResult.headers['location'] ?? null;
  }

  evidence.tls = tlsResult;
  evidence.spfTxtRecords = spfResult.records;
  evidence.dmarcTxtRecords = dmarcResult.records;

  return evidence;
}

/**
 * Collect evidence and run all security checks.
 */
export async function runSecurityAudit(
  targetUrl: string,
  options: CollectOptions = {}
): Promise<Finding[]> {
  const evidence = await collectSecurityEvidence(targetUrl, options);
  return runSecurityChecks(evidence);
}

function toHttp(url: string): string {
  try {
    const u = new URL(url);
    return `http://${u.host}/`;
  } catch {
    return `http://${url}/`;
  }
}

function toHttps(url: string): string {
  try {
    const u = new URL(url);
    return `https://${u.host}/`;
  } catch {
    return `https://${url}/`;
  }
}

function hostnameOf(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return url.replace(/^\w+:\/\//, '').replace(/\/.*$/, '');
  }
}
