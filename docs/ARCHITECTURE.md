# Architecture

```
Browser (Next.js web + PWA)
   -> API routes (auth, workspaces, sites, scan requests, quotas, billing webhooks)
        -> Postgres (users, workspaces, sites, scan_runs, findings, reports, subscriptions, alerts)
        -> Redis/BullMQ queue
              -> Worker (isolated container)
                   perf: PSI API | seo: fetch+parse+bounded crawl | security: TLS, headers, cookies, DNS
                   -> store raw evidence -> normalize findings -> (async) AI explain -> alerts/reports
```

## Rules
- Web requests never run scans; they enqueue scan_jobs and poll/subscribe.
- Worker has network egress policy (public only), no cloud metadata access, scoped DB role (insert scan data only).
- Raw evidence + normalized findings persisted so reports regenerate without rescanning.
- Cache PSI results (same URL+strategy within TTL). Cache AI explanations keyed by finding fingerprint.
- Scheduled scans: BullMQ repeatable jobs honoring plan entitlements.
- Workspace-level authz middleware on every route; test cross-tenant access.

## AI layer
packages/ai: model router, explain service, investigation orchestrator (tool allowlist, caps, audit_log). Spec: docs/AI-OPERATOR.md. Runs after deterministic scans; never scans by itself.

## Repo layout
apps/web, apps/worker, packages/shared (zod, plans.ts, check IDs), packages/scanner (checks/, net/safe-fetch.ts), packages/ai, docs/, infra/ (Dockerfiles, compose)

## Env vars (server only)
DATABASE_URL, REDIS_URL, PSI_API_KEY, LLM_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, RESEND_API_KEY (or similar), APP_URL
