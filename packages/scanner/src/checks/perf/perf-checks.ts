/**
 * Performance checks using PageSpeed Insights API.
 * Produces findings per the FindingSchema from packages/shared.
 */

import {
  generateFingerprint,
  CHECK_NAMES,
  PERF_CHECKS,
  type Finding,
  type Evidence,
} from '@sitehealth/shared';
import type {
  PSIClient} from './psi-client';
import {
  PSIQuotaError,
  PSIApiKeyError,
  PSIInvalidUrlError,
  PSIApiError,
  type PSIExtractedMetrics,
} from './psi-client';

export interface PerfCheckConfig {
  psiClient?: PSIClient;
  lcpThresholdMs?: number; // Good: <= 2500, Needs improvement: <= 4000
  clsThreshold?: number; // Good: <= 0.1, Needs improvement: <= 0.25
  inpThresholdMs?: number; // Good: <= 200, Needs improvement: <= 500
  scoreThreshold?: number; // Good: >= 0.9
}

// Threshold defaults; psiClient is optional and not part of this record.
const DEFAULT_THRESHOLDS: Required<
  Pick<PerfCheckConfig, 'lcpThresholdMs' | 'clsThreshold' | 'inpThresholdMs' | 'scoreThreshold'>
> = {
  lcpThresholdMs: 2500,
  clsThreshold: 0.1,
  inpThresholdMs: 200,
  scoreThreshold: 0.9,
};

/**
 * Determine severity based on metric value and thresholds.
 */
function getLCPSeverity(lcpMs: number, threshold: number): 'info' | 'low' | 'medium' | 'high' {
  if (lcpMs <= threshold) return 'info'; // Good
  if (lcpMs <= threshold * 1.6) return 'low'; // 2500-4000: needs improvement
  return 'medium'; // > 4000: poor
}

function getCLSSeverity(cls: number, threshold: number): 'info' | 'low' | 'medium' | 'high' {
  if (cls <= threshold) return 'info'; // Good
  if (cls <= threshold * 2.5) return 'low'; // 0.1-0.25: needs improvement
  return 'medium'; // > 0.25: poor
}

function getINPSeverity(inpMs: number, threshold: number): 'info' | 'low' | 'medium' | 'high' {
  if (inpMs <= threshold) return 'info'; // Good
  if (inpMs <= threshold * 2.5) return 'low'; // 200-500: needs improvement
  return 'medium'; // > 500: poor
}

function getScoreSeverity(score: number, threshold: number): 'info' | 'low' | 'medium' | 'high' {
  if (score >= threshold) return 'info'; // Good
  if (score >= 0.5) return 'low'; // 0.5-0.9: needs improvement
  return 'medium'; // < 0.5: poor
}

/**
 * Create a finding from PSI metrics.
 */
function createFinding(
  checkId: string,
  category: 'perf',
  severity: 'info' | 'low' | 'medium' | 'high',
  url: string,
  observedValue: unknown,
  expected: unknown,
  checkName: string,
  responseMeta: Record<string, unknown>
): Finding {
  const evidence: Evidence = {
    url,
    observed_value: observedValue,
    expected,
    checked_at: new Date().toISOString(),
    check_name: checkName,
    response_meta: responseMeta,
  };

  const fingerprint = generateFingerprint(checkId, url, observedValue);

  return {
    check_id: checkId,
    category,
    severity,
    status: severity === 'info' ? 'resolved' : 'open',
    confidence: 'observed',
    evidence,
    fingerprint,
  };
}

/**
 * Resolve the four metric thresholds with their defaults.
 */
function resolveThresholds(config: PerfCheckConfig): {
  lcpThresholdMs: number;
  clsThreshold: number;
  inpThresholdMs: number;
  scoreThreshold: number;
} {
  return {
    lcpThresholdMs: config.lcpThresholdMs ?? DEFAULT_THRESHOLDS.lcpThresholdMs,
    clsThreshold: config.clsThreshold ?? DEFAULT_THRESHOLDS.clsThreshold,
    inpThresholdMs: config.inpThresholdMs ?? DEFAULT_THRESHOLDS.inpThresholdMs,
    scoreThreshold: config.scoreThreshold ?? DEFAULT_THRESHOLDS.scoreThreshold,
  };
}

/**
 * Run all performance checks for a URL (both mobile and desktop).
 * Returns findings for each check.
 */
export async function runPerfChecks(
  url: string,
  config: PerfCheckConfig = {}
): Promise<Finding[]> {
  const thresholds = resolveThresholds(config);
  // Local import kept dynamic so importing this module does not construct the
  // client when an injected one is provided. NodeNext requires the .js suffix.
  const client =
    config.psiClient ??
    new (await import('./psi-client.js')).PSIClient();
  const findings: Finding[] = [];

  // Run for both mobile and desktop
  for (const strategy of ['mobile', 'desktop'] as const) {
    try {
      const metrics = await client.fetch(url, strategy);
      const strategyFindings = createFindingsFromMetrics(metrics, thresholds, strategy);
      findings.push(...strategyFindings);
    } catch (error) {
      // Create error findings for each check when PSI fails
      const errorFindings = createErrorFindings(url, error, strategy);
      findings.push(...errorFindings);
    }
  }

  return findings;
}

/**
 * Create findings from successful PSI metrics.
 */
function createFindingsFromMetrics(
  metrics: PSIExtractedMetrics,
  thresholds: {
    lcpThresholdMs: number;
    clsThreshold: number;
    inpThresholdMs: number;
    scoreThreshold: number;
  },
  strategy: 'mobile' | 'desktop'
): Finding[] {
  const findings: Finding[] = [];
  const isMobile = strategy === 'mobile';
  const baseUrl = metrics.url;

  // LCP check
  if (metrics.lcpMs !== null) {
    const severity = getLCPSeverity(metrics.lcpMs, thresholds.lcpThresholdMs);
    const checkId = isMobile ? PERF_CHECKS.LCP : PERF_CHECKS.LCP;
    findings.push(
      createFinding(
        checkId,
        'perf',
        severity,
        baseUrl,
        metrics.lcpMs,
        `<= ${thresholds.lcpThresholdMs}ms`,
        CHECK_NAMES[PERF_CHECKS.LCP],
        { strategy, metric: 'lcp', rawValue: metrics.lcpMs }
      )
    );
  } else {
    findings.push(
      createFinding(
        PERF_CHECKS.LCP,
        'perf',
        'info',
        baseUrl,
        'unavailable',
        `<= ${thresholds.lcpThresholdMs}ms`,
        CHECK_NAMES[PERF_CHECKS.LCP],
        { strategy, metric: 'lcp', reason: 'metric not available' }
      )
    );
  }

  // CLS check
  if (metrics.cls !== null) {
    const severity = getCLSSeverity(metrics.cls, thresholds.clsThreshold);
    findings.push(
      createFinding(
        PERF_CHECKS.CLS,
        'perf',
        severity,
        baseUrl,
        metrics.cls,
        `<= ${thresholds.clsThreshold}`,
        CHECK_NAMES[PERF_CHECKS.CLS],
        { strategy, metric: 'cls', rawValue: metrics.cls }
      )
    );
  } else {
    findings.push(
      createFinding(
        PERF_CHECKS.CLS,
        'perf',
        'info',
        baseUrl,
        'unavailable',
        `<= ${thresholds.clsThreshold}`,
        CHECK_NAMES[PERF_CHECKS.CLS],
        { strategy, metric: 'cls', reason: 'metric not available' }
      )
    );
  }

  // INP check
  if (metrics.inpMs !== null) {
    const severity = getINPSeverity(metrics.inpMs, thresholds.inpThresholdMs);
    findings.push(
      createFinding(
        PERF_CHECKS.INP,
        'perf',
        severity,
        baseUrl,
        metrics.inpMs,
        `<= ${thresholds.inpThresholdMs}ms`,
        CHECK_NAMES[PERF_CHECKS.INP],
        { strategy, metric: 'inp', rawValue: metrics.inpMs }
      )
    );
  } else {
    findings.push(
      createFinding(
        PERF_CHECKS.INP,
        'perf',
        'info',
        baseUrl,
        'unavailable',
        `<= ${thresholds.inpThresholdMs}ms`,
        CHECK_NAMES[PERF_CHECKS.INP],
        { strategy, metric: 'inp', reason: 'metric not available' }
      )
    );
  }

  // Score check (mobile/desktop specific)
  if (metrics.score !== null) {
    const scoreCheckId = isMobile ? PERF_CHECKS.SCORE_MOBILE : PERF_CHECKS.SCORE_DESKTOP;
    const severity = getScoreSeverity(metrics.score, thresholds.scoreThreshold);
    findings.push(
      createFinding(
        scoreCheckId,
        'perf',
        severity,
        baseUrl,
        metrics.score,
        `>= ${thresholds.scoreThreshold}`,
        CHECK_NAMES[scoreCheckId],
        { strategy, metric: 'score', rawValue: metrics.score }
      )
    );
  } else {
    const scoreCheckId = isMobile ? PERF_CHECKS.SCORE_MOBILE : PERF_CHECKS.SCORE_DESKTOP;
    findings.push(
      createFinding(
        scoreCheckId,
        'perf',
        'info',
        baseUrl,
        'unavailable',
        `>= ${thresholds.scoreThreshold}`,
        CHECK_NAMES[scoreCheckId],
        { strategy, metric: 'score', reason: 'metric not available' }
      )
    );
  }

  return findings;
}

/**
 * Create error findings when PSI API fails.
 */
function createErrorFindings(url: string, error: unknown, strategy: 'mobile' | 'desktop'): Finding[] {
  const findings: Finding[] = [];
  const isQuota = error instanceof PSIQuotaError;
  const isApiKey = error instanceof PSIApiKeyError;
  const isInvalidUrl = error instanceof PSIInvalidUrlError;
  const isApiError = error instanceof PSIApiError;

  const checkIds = strategy === 'mobile'
    ? [PERF_CHECKS.LCP, PERF_CHECKS.CLS, PERF_CHECKS.INP, PERF_CHECKS.SCORE_MOBILE]
    : [PERF_CHECKS.LCP, PERF_CHECKS.CLS, PERF_CHECKS.INP, PERF_CHECKS.SCORE_DESKTOP];

  for (const checkId of checkIds) {
    let severity: 'info' | 'low' | 'medium' | 'high' = 'info';
    let observedValue = 'error';
    let expected = 'successful PSI response';

    if (isQuota) {
      severity = 'low';
      observedValue = 'quota_exceeded';
      expected = 'PSI API quota available';
    } else if (isApiKey) {
      severity = 'low';
      observedValue = 'invalid_api_key';
      expected = 'valid PSI API key';
    } else if (isInvalidUrl) {
      severity = 'low';
      observedValue = 'invalid_url';
      expected = 'valid URL';
    } else if (isApiError) {
      severity = 'low';
      observedValue = `api_error_${error.statusCode}`;
      expected = 'successful PSI response';
    } else {
      severity = 'low';
      observedValue = 'unknown_error';
      expected = 'successful PSI response';
    }

    findings.push(
      createFinding(
        checkId,
        'perf',
        severity,
        url,
        observedValue,
        expected,
        CHECK_NAMES[checkId],
        { strategy, error: error instanceof Error ? error.message : String(error) }
      )
    );
  }

  return findings;
}

/**
 * Run a single performance check by check ID.
 */
export async function runSinglePerfCheck(
  url: string,
  checkId: string,
  config: PerfCheckConfig = {}
): Promise<Finding | null> {
  const findings = await runPerfChecks(url, config);
  return findings.find(f => f.check_id === checkId) ?? null;
}