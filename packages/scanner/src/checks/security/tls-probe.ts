/**
 * TLS certificate inspection.
 *
 * SSRF discipline (hard rule 1): the target hostname is first validated
 * through safe-fetch's own validateFetchUrl (URL rules + DNS resolution +
 * rejection), then the connection is pinned to the first public IP that
 * safe-fetch's resolver returned, with the original hostname used for SNI.
 * Only the TLS handshake is performed - no HTTP request is sent, and the
 * socket is destroyed immediately after certificate retrieval.
 */
import { connect as tlsConnect } from 'tls';
import { validateFetchUrl, resolveHostname } from '../../net/safe-fetch';

export interface TlsProbeResult {
  valid: boolean;
  /** notAfter as ISO string when available. */
  validUntil: string | null;
  error: string | null;
  issuer: string | null;
}

interface CertLike {
  valid_to_date?: Date;
  issuer?: { O?: string | string[]; CN?: string | string[] };
}

export const TLS_PROBE_TIMEOUT_MS = 10_000;

/**
 * Inspect the certificate for an https:// target.
 * Never throws: failures are reported in `error`.
 */
export async function inspectTls(targetUrl: string, timeoutMs = TLS_PROBE_TIMEOUT_MS): Promise<TlsProbeResult> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { valid: false, validUntil: null, error: 'invalid URL', issuer: null };
  }

  // Reuse safe-fetch's validation (URL rules + DNS + private-IP rejection).
  const validation = await validateFetchUrl(targetUrl);
  if (!validation.valid) {
    return { valid: false, validUntil: null, error: validation.error ?? 'target validation failed', issuer: null };
  }

  let ips: string[];
  try {
    ips = await resolveHostname(parsed.hostname, []);
  } catch (error) {
    return { valid: false, validUntil: null, error: error instanceof Error ? error.message : 'DNS lookup failed', issuer: null };
  }
  const ip = ips[0];

  return new Promise<TlsProbeResult>((resolve) => {
    const done = (result: TlsProbeResult) => {
      try { socket.destroy(); } catch { /* already gone */ }
      resolve(result);
    };
    const socket = tlsConnect({
      host: ip,
      port: 443,
      servername: parsed.hostname, // SNI: original hostname, validated IP as host
      rejectUnauthorized: true,
      timeout: timeoutMs,
    });

    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate() as CertLike;
      const authorized = socket.authorized;
      const issuerObj = cert.issuer?.O ?? cert.issuer?.CN;
      done({
        valid: authorized,
        validUntil: cert.valid_to_date instanceof Date ? cert.valid_to_date.toISOString() : null,
        error: authorized ? null : (socket.authorizationError as unknown as string) ?? 'authorization failed',
        issuer: Array.isArray(issuerObj) ? issuerObj[0] : issuerObj ?? null,
      });
    });
    socket.once('error', (err: Error) => {
      done({ valid: false, validUntil: null, error: err.message, issuer: null });
    });
    socket.once('timeout', () => {
      done({ valid: false, validUntil: null, error: 'TLS handshake timeout', issuer: null });
    });
  });
}
