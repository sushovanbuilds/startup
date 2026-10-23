# Tasks (claim before starting; tick when done)
Format: [ ] ID title | Paths | Spec | Needs | Acceptance
Lanes can run in parallel by different agents. Stage order matters, lanes inside a stage don't.

## Stage 0 — Foundation (do first, one agent)
[x] T0.1 Monorepo scaffold (pnpm, TS strict, eslint, vitest) | root | ARCHITECTURE | - | pnpm dev/test/lint/typecheck work (claimed: agent 2026-10-23)
[x] T0.2 packages/shared: zod finding schema, check IDs, plans.ts entitlements | packages/shared | FINDINGS-SPEC, PRD | T0.1 | exported + unit tests (claimed: agent 2026-10-23)
[ ] T0.3 DB schema + migrations | packages/db | DATA-MODEL | T0.1 | migrate up/down clean

## Stage 1 — Free scanner (lanes A/B/C parallel)
[x] T1.1 (A) safe-fetch + full SSRF test suite | packages/scanner/src/net | SECURITY-SCANNER | T0.1 | all listed tests pass (claimed: agent 2026-10-23)
[ ] T1.2 (B) PSI client + caching + perf checks | packages/scanner/src/checks/perf | FINDINGS-SPEC | T0.2 | fixtures; handles API errors/quota
[ ] T1.3 (B) SEO checks + bounded crawler (uses safe-fetch) | packages/scanner/src/checks/seo | FINDINGS-SPEC | T1.1,T0.2 | fixture tests; respects limits
[ ] T1.4 (C) Security checks: TLS, headers, cookies, SPF/DMARC | packages/scanner/src/checks/security | FINDINGS-SPEC | T1.1,T0.2 | fixture tests; no false-alarm wording
[ ] T1.5 Scan orchestrator + normalization + fingerprinting | packages/scanner | FINDINGS-SPEC | T1.2-1.4 | URL in -> findings out
[ ] T1.6 Landing page + free scan UI + results + share link | apps/web | PRD | T1.5 | works end-to-end with rate limit

## Stage 2 — Platform
[ ] T2.1 Auth + workspaces + membership + authz middleware | apps/web | DATA-MODEL | T0.3 | cross-tenant tests
[ ] T2.2 Sites CRUD + domain verification (DNS TXT) | apps/web | SECURITY-SCANNER | T2.1 | verified flag works
[ ] T2.3 Queue + isolated worker + scan_jobs/runs storage | apps/worker | ARCHITECTURE | T1.5,T0.3 | retries, timeouts, no DB admin creds
[ ] T2.4 Dashboard: sites, scan history, findings table, status/assignee | apps/web | PRD | T2.2,T2.3 | responsive

## Stage 3 — AI operator (after Stage 2)
[ ] T3.1 Model router + cost/usage logging | packages/ai | AI-OPERATOR | T2.3 | provider-agnostic, per-call cost recorded
[ ] T3.2 Explain service (zod output, evidence-citation validation, fallback, cache) | packages/ai | FINDINGS-SPEC, AI-OPERATOR | T3.1 | no claim without evidence
[ ] T3.3 Change detection (new/resolved/worsened) + rescan verify | packages/scanner | FINDINGS-SPEC | T2.3 | diff tests
[ ] T3.4 Investigation orchestrator: tool allowlist + hard caps + audit_log | packages/ai | AI-OPERATOR | T3.2,T3.3 | caps enforced; prompt-injection test passes
[ ] T3.5 Credits/entitlements for investigations, deep, chat | shared + web | AI-OPERATOR, PRD | T3.4 | blocks when exhausted
[ ] T3.6 Grounded chat over stored scans (retrieval, workspace-scoped) | apps/web | AI-OPERATOR | T3.4 | cross-tenant leak test
[ ] T3.7 Remediation drafts + approvals table (draft-only) | apps/web | AI-OPERATOR | T3.4 | no auto-apply
[ ] T3.8 Email alerts (cert expiry, regressions) | apps/worker | FINDINGS-SPEC | T3.3 | dedupe

## Stage 4 — Agency value
[ ] T4.1 Scheduled scans by entitlement | apps/worker | PRD | T2.3 | honors plan
[ ] T4.2 Branded PDF report from stored data | apps/web | PRD | T3.1 | no rescan
[ ] T4.3 Client share link + monthly email summary | apps/web | PRD | T4.2 | tokenized, revocable

## Stage 5 — Billing
[ ] T5.1 Razorpay plans + checkout + subscription state | apps/web | PRD | T2.1 | test mode
[ ] T5.2 Webhooks: signature verify + idempotent (webhook_events) | apps/web | ARCHITECTURE | T5.1 | replay-safe
[ ] T5.3 Entitlement enforcement + usage_counters everywhere | shared + web + worker | PRD | T5.2 | over-quota blocked

## Stage 6 — Launch hardening
[ ] T6.1 Abuse controls, budgets, logging, error tracking | all | SECURITY-SCANNER | all | dashboards/alerts set
[ ] T6.2 Legal pages (ToS, AUP, privacy), abuse contact | apps/web | SECURITY-SCANNER | - | published
