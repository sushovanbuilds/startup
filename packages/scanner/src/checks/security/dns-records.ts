/**
 * SPF/DMARC DNS TXT record lookups.
 *
 * Default resolver is a node:dns callback-wrapped lookup; tests inject a
 * stub via setTxtResolverForTesting (same injection pattern as safe-fetch).
 */
import { resolveTxt } from 'dns';
import { promisify } from 'util';

export type TxtLookup = (hostname: string) => Promise<string[][]>;

const resolveTxtAsync = promisify(resolveTxt) as (hostname: string) => Promise<string[][]>;

let instance: TxtLookup = (hostname) => resolveTxtAsync(hostname);

export function setTxtResolverForTesting(lookup: TxtLookup): void {
  instance = lookup;
}

export function resetTxtResolver(): void {
  instance = (hostname) => resolveTxtAsync(hostname);
}

export interface TxtLookupResult {
  /** TXT records flattened to single strings (record chunks joined). */
  records: string[];
  /** Human-readable error if the lookup failed outright. */
  error: string | null;
}

/**
 * Look up TXT records for a hostname. DNS "not found"/"no data" is not an
 * error: it returns { records: [], error: null }.
 */
export async function getTxtRecords(hostname: string): Promise<TxtLookupResult> {
  try {
    const chunks = await instance(hostname);
    return { records: chunks.map((c) => c.join('')), error: null };
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
      return { records: [], error: null };
    }
    return { records: [], error: err.message ?? 'TXT lookup failed' };
  }
}
