# Decisions (one line each)
- Web-first, PWA later, Android only if demand proven.
- PSI API as perf engine for v1; no custom Lighthouse infra yet.
- Deterministic checks first; AI explains stored evidence only.
- Monorepo with separate worker process.
- Pricing in packages/shared/plans.ts is a hypothesis; change there only.
- Drizzle ORM for DB schema/migrations (type-safe, lightweight, works with Postgres/Supabase)
- eslint-config-next@14.2.35 devDep in apps/web — makes `next lint` non-interactive and gives the web app a real lint gate.
