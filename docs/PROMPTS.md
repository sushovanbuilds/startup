# Copy-paste prompts (switch agents freely)

## Resume (use after every agent switch)
Read AGENTS.md and the last 30 lines of docs/HANDOFF.md. Run `git status` and `git log --oneline -5`. Find the task claimed-but-unticked in docs/TASKS.md (or described in HANDOFF.md). Continue it on its existing branch, opening only its Spec doc and in-scope files. Do not redo finished work or start a new task until acceptance criteria are met. Run typecheck, lint, test; then tick the task and append to HANDOFF.md. If nothing is in progress, pick the first unclaimed task whose Needs are ticked.

## Checkpoint (send when tokens are nearly out)
Token limit is close. Commit all work-in-progress to the current branch as "wip(<task-id>): <what works>". Then append to docs/HANDOFF.md (max 8 lines): done, half-done (file + function names), exact next step, failing tests, assumptions. Do nothing else.

## Review (leftover tokens)
Read AGENTS.md hard rules and docs/SECURITY-SCANNER.md. Review the diff of branch <branch> only. Report hard-rule violations, SSRF gaps, missing tests, false-positive risks. Do not edit code; list issues with file and line.

## Lane A — safe-fetch (T1.1)
Read AGENTS.md and docs/SECURITY-SCANNER.md only. Claim and do T1.1: packages/scanner/src/net/safe-fetch.ts with every requirement and listed test (private/reserved IPv4+IPv6, metadata hosts, decimal/hex IPs, DNS-to-private, per-hop redirect revalidation, DNS pinning, size/time limits). Branch agent/T1.1-safe-fetch. No other checks. Update TASKS.md and HANDOFF.md.

## Lane B — perf + SEO (T1.2, T1.3)
Read AGENTS.md and docs/FINDINGS-SPEC.md only. Claim T1.2: PageSpeed Insights client (mobile+desktop), caching, error/quota handling, findings per schema, fixture tests (mock API, no live calls). Then T1.3 SEO checks + bounded crawler only after T1.1 is ticked (all fetches via safe-fetch). Branch per task.

## Lane C — security posture checks (T1.4)
Read AGENTS.md and docs/FINDINGS-SPEC.md only. Claim T1.4: sec.https_redirect, tls_valid, tls_expiry, hsts, csp, xcto, referrer_policy, frame_options, cookie_flags, spf, dmarc. Pass/fail/edge fixture tests each. Wording "needs review"/"observed", never "vulnerable". Prefer under-reporting. Start pure-logic parts if T1.1 isn't ticked. Branch agent/T1.4-security-checks.

## After lanes A-C: T1.5 then T1.6
Read AGENTS.md and docs/FINDINGS-SPEC.md. Claim T1.5 (orchestrator + normalization + fingerprinting: URL in -> findings out). Then T1.6 (landing page, free scan UI, results, share link, rate limiting) reading docs/PRD.md.
