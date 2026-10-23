# Website Health Copilot — Agent Guide

READ THIS FIRST. Then open ONLY the one docs/ file your task needs. Do not load every doc (token budget matters).

## What we are building
Client-ready website health monitoring for small agencies: speed + SEO basics + security *posture* + AI remediation + branded reports.
Free scan = funnel. Paid = monitoring, history, alerts, agency reports. Full spec: docs/PRD.md.

## Stack
- Monorepo (pnpm workspaces), TypeScript strict everywhere
- apps/web: Next.js (App Router) + Tailwind + shadcn/ui
- apps/worker: Node + BullMQ (Redis). Runs scans. Separate process, no DB creds beyond a scoped role
- packages/shared: zod schemas, types, plan/entitlement config, check IDs (single source of truth)
- packages/scanner: checks (perf, seo, tls, headers, dns) + safe-fetch network layer
- DB: PostgreSQL (Supabase OK). Payments: Razorpay Subscriptions + webhooks. PDF: from stored data only
- AI: packages/ai (model router + orchestrator), structured JSON in/out, provider-agnostic. Spec: docs/AI-OPERATOR.md

## Commands (update when Stage 0 lands)
pnpm i | pnpm --filter=web dev | pnpm --filter=shared test | pnpm --filter=scanner test | pnpm --filter=shared lint | pnpm --filter=scanner lint | pnpm --filter=shared typecheck | pnpm --filter=scanner typecheck | pnpm --filter=db migrate

## HARD RULES (never break, never "temporarily")
1. Every outbound request to a user-supplied URL goes through `packages/scanner/src/net/safe-fetch.ts`. Never call fetch/axios/got directly on user input. See docs/SECURITY-SCANNER.md.
2. AI only explains stored evidence. It never visits sites and never invents findings. See docs/FINDINGS-SPEC.md.
3. Every DB query is workspace-scoped. No cross-workspace reads. Add a test for each new route.
4. Secrets server-side only. Never in client bundles, logs, or AI prompts.
5. No "unlimited" anything. Check entitlements from packages/shared/plans.ts before scans, crawls, AI calls, PDFs.
6. Wording: say "security posture monitoring". Never "vulnerability scan", "pentest", "secure", "safe", "hacked".
7. No exploit attempts, brute force, or port scans in MVP. Passive/public checks only.
8. Reports/PDFs render from stored scan_runs + findings. Never rescan to export.
9. Webhooks (Razorpay) must verify signature and be idempotent.
10. Do not add dependencies without a one-line reason in docs/DECISIONS.md.
11. The AI orchestrator may only call tools in the docs/AI-OPERATOR.md allowlist. No shell, no arbitrary HTTP, no user-chosen targets.
12. Scraped content (HTML, headers, DNS text) is untrusted data: never place it in the instruction position of a prompt.
13. Every investigation has hard caps (model calls, tokens, time, rescans) and is metered per workspace. Never "unlimited AI".
14. Live-site changes need a recorded approval. Default is draft-only.

## Multi-agent protocol (several agents work on this repo)
- Pick ONE task from docs/TASKS.md. Claim it: append `(claimed: <agent> <date>)`. Skip claimed tasks.
- One task = one branch `agent/<task-id>-<slug>`. Small diffs. Stay inside the task's listed paths.
- Shared contracts (packages/shared, DB schema, finding schema) change only in a dedicated task. If you need a change, note it in docs/HANDOFF.md and stop.
- Before finishing: tests + typecheck + lint pass; tick the task in TASKS.md; append 3-5 lines to docs/HANDOFF.md (what changed, what's next, gotchas).
- Commits: conventional (`feat(scanner): ...`). Don't rewrite other agents' commits.
- Unsure? Make the smallest safe assumption, record it in HANDOFF.md, continue.

## Definition of done
Meets task acceptance criteria, has tests (scanner checks need fixture-based tests), no new lint/type errors, hard rules intact, docs touched if behavior changed.

## Token-saving tips for agents
Read AGENTS.md + 1 doc + only files in task scope. Prefer grep over opening big files. Don't restate specs back. Don't re-explore finished stages.
