# Findings & AI spec

## Finding shape (zod in packages/shared)
{ check_id, category, severity, status, confidence: "observed"|"inferred"|"untested",
  evidence: { url, observed_value, expected?, checked_at, check_name, response_meta? },
  fingerprint: hash(check_id + url + observed_value) }

## MVP check catalog (deterministic; no AI)
perf: psi.lcp, psi.cls, psi.inp, psi.score_mobile, psi.score_desktop
seo: seo.title, seo.meta_description, seo.h1, seo.canonical, seo.robots_indexability, seo.broken_links (bounded)
security: sec.https_redirect, sec.tls_valid, sec.tls_expiry, sec.hsts, sec.csp, sec.xcto, sec.referrer_policy, sec.frame_options, sec.cookie_flags, sec.spf, sec.dmarc
Add a check only with: fixture tests (pass/fail/edge), false-positive notes, and a severity rationale.
Severity bias: prefer under-reporting to false alarms. Missing header = low/medium "needs review", never "vulnerable".

## AI contract (single-finding explain; orchestration in docs/AI-OPERATOR.md)
Input: ONLY the stored finding JSON (no raw page HTML, no private data, no secrets).
Output (validate with zod, retry once, else fallback to static template):
{ summary, why_it_matters, priority: "now"|"soon"|"later", fix_steps[], example_fix?: {platform, snippet}, verify_steps[], caveats[] }
Prompt rules: do not claim exploitation or compromise; state what was observed vs inferred; note policy depends on site features (esp. CSP); never invent URLs/versions; output is a recommendation until retested.
Cache by fingerprint. Only call AI for new/changed findings. Respect plan ai_calls quota.

## Resolution
Mark `resolved` only when a later scan of the same check no longer reproduces the finding.
Change detection = diff findings by fingerprint between consecutive scan_runs: new / resolved / worsened.
