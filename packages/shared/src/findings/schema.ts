import { z } from 'zod';
import { CheckId } from '../checks/ids';

/**
 * Finding schema matching the spec in docs/FINDINGS-SPEC.md
 * { check_id, category, severity, status, confidence, evidence, fingerprint }
 */

export const EvidenceSchema = z.object({
  url: z.string().url(),
  observed_value: z.unknown(),
  expected: z.unknown().optional(),
  checked_at: z.string().datetime({ offset: true }),
  check_name: z.string(),
  response_meta: z.record(z.unknown()).optional(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const FindingSchema = z.object({
  check_id: z.string(), // Will validate against CheckId at runtime
  category: z.enum(['perf', 'seo', 'security']),
  severity: z.enum(['info', 'low', 'medium', 'high']),
  status: z.enum(['open', 'resolved', 'accepted']),
  confidence: z.enum(['observed', 'inferred', 'untested']),
  evidence: EvidenceSchema,
  fingerprint: z.string(),
  ai_explanation: z
    .object({
      summary: z.string(),
      why_it_matters: z.string(),
      priority: z.enum(['now', 'soon', 'later']),
      fix_steps: z.array(z.string()),
      example_fix: z
        .object({
          platform: z.string(),
          snippet: z.string(),
        })
        .optional(),
      verify_steps: z.array(z.string()),
      caveats: z.array(z.string()),
    })
    .optional(),
});

export type Finding = z.infer<typeof FindingSchema>;

export const ScanSummarySchema = z.object({
  total_checks: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  by_category: z.object({
    perf: z.object({ passed: z.number(), failed: z.number() }),
    seo: z.object({ passed: z.number(), failed: z.number() }),
    security: z.object({ passed: z.number(), failed: z.number() }),
  }),
  by_severity: z.object({
    high: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
    info: z.number().int().nonnegative(),
  }),
});

export type ScanSummary = z.infer<typeof ScanSummarySchema>;

export function generateFingerprint(checkId: string, url: string, observedValue: unknown): string {
  const str = `${checkId}|${url}|${JSON.stringify(observedValue)}`;
  // Simple hash for fingerprint - in production use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}