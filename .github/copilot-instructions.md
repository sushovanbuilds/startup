# Copilot instructions
Canonical guide: AGENTS.md (read it). Summary of non-negotiables:
- TypeScript strict; pnpm monorepo (apps/web, apps/worker, packages/shared, packages/scanner).
- All fetches to user-supplied URLs MUST use packages/scanner/src/net/safe-fetch.ts (SSRF protection). Never raw fetch.
- AI explains stored evidence only; never invents findings.
- Every query is workspace-scoped; secrets server-side only.
- Entitlements come from packages/shared/plans.ts. No unlimited usage.
- Say "security posture monitoring", never "vulnerability scan"/"secure".
- Work one task at a time from docs/TASKS.md; update docs/HANDOFF.md when done.
