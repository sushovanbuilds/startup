# Handoff log (append-only; newest at bottom; keep entries to 3-5 lines)
Template:
## <date> <agent> <task-id>
- Done:
- Next/blocked:
- Gotchas/assumptions:

## 2026-10-23 agent T0.1
- Done: Monorepo scaffold with pnpm workspaces (apps/web, apps/worker, packages/shared, packages/scanner, packages/db), TypeScript strict mode, ESLint, Vitest, root scripts (dev, test, lint, typecheck, db:migrate). Created docker-compose.yml for Postgres + Redis.
- Next/blocked: T0.2 packages/shared
- Gotchas/assumptions: Used Next.js App Router, Tailwind, shadcn/ui for web; BullMQ/Redis for worker; Drizzle ORM chosen for DB (logged in DECISIONS.md)

## 2026-10-23 agent T0.2
- Done: packages/shared with zod finding schema, check ID constants (perf/seo/security), plans.ts with Free/Solo/Agency Starter/Agency Pro entitlements from PRD. All exports have unit tests (45 tests passing).
- Next/blocked: T0.3 DB schema + migrations
- Gotchas/assumptions: Entitlements enforced via checkEntitlement() helper; check IDs match FINDINGS-SPEC catalog

## 2026-10-23 agent T1.1
- Done: packages/scanner/src/net/safe-fetch.ts with full SSRF protection per SECURITY-SCANNER.md. Implements: http/https only, ports 80/443 allowlist, DNS resolution with private IP rejection (IPv4: 10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, link-local, multicast, reserved; IPv6: ::1, fe80::/10, fc00::/7, ff00::/8, IPv4-mapped), cloud metadata IP/hostname blocking (169.254.169.254, metadata.google.internal, etc.), DNS pinning to defeat rebinding, manual redirect following (max 5) with per-hop revalidation, 10s request/20s total timeout, 2MB response limit, credential/obfuscated IP/localhost rejection, no cookie/auth forwarding, custom User-Agent with abuse contact. All 14 required test cases covered (46 tests passing).
- Next/blocked: T1.2 PSI client + perf checks, T1.3 SEO checks, T1.4 Security checks
- Gotchas/assumptions: Used dns/promises API pattern with injected resolver for testability; IPv6 fe80::/10 check uses first hextet range 0xfe80-0xfebf

## 2026-10-23 agent T1.2
- Done: packages/scanner/src/checks/perf with PSI API client (mobile+desktop, 24h response cache with TTL expiry, never caches failures), metrics extraction preferring field data over lab data (LCP/CLS/INP, FID fallback for INP), and perf checks psi.lcp/psi.cls/psi.inp/psi.score_mobile/psi.score_desktop producing FindingSchema-valid findings with severity bands (thresholds configurable). 21 fixture-based tests (6 fixtures); safe-fetch mocked, no live calls; quota/invalid-key/invalid-url/generic API errors all degrade to low-severity findings instead of crashing.
- Next/blocked: T1.3 SEO checks (uses safe-fetch) unblocked.
- Gotchas: root tsconfig has noEmit:true so package builds emit nothing; added packages/scanner/vitest.config.ts aliasing @sitehealth/shared to source and tsconfig paths override — shared dist never existed and tests/typecheck now resolve source directly. Also added @sitehealth/shared as workspace dependency of scanner.

## 2026-10-23 agent T1.3
- Done: packages/scanner/src/checks/seo with a bounded same-origin crawler on safe-fetch (depth <= 2, per-scan maxPages from plan entitlement, MAX_LINKS_PER_PAGE=10/page, MAX_UNIQUE_LINKS_PROBED=50 global, 4xx pages recorded as broken not scanned) and all six SEO checks (seo.title, seo.meta_description, seo.h1, seo.canonical, seo.robots_indexability incl. X-Robots-Tag header, seo.broken_links) producing FindingSchema-valid findings with under-reporting severity bands. 29 fixture-based tests; safe-fetch mocked, no live calls; runSeoChecks() is the URL-in entry point.
- Next/blocked: T1.4 security checks (lane C) and T1.5 orchestrator.
- Gotchas: HTML extraction is regex-based (no parser dep added, per hard rule 10); canonical only flags missing/absolute since WHATWG URL resolves almost any string; empty meta description content treated as missing.
