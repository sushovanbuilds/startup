# Which agent reads what
| Agent | Auto-reads | Notes |
|---|---|---|
| opencode | AGENTS.md (+ opencode.json) | |
| Codex | AGENTS.md | |
| Freebuff | AGENTS.md | If it ignores it, paste "Read AGENTS.md first" as first prompt |
| GitHub Copilot | .github/copilot-instructions.md (+ AGENTS.md in agent mode) | |
| Antigravity | GEMINI.md, .agent/rules/, .agent/workflows/ | Run workflow "pick-task" |

Kickoff prompt for any agent:
"Read AGENTS.md. Pick the first unclaimed task in docs/TASKS.md whose Needs are ticked, claim it, open only its Spec doc, implement with tests, then update TASKS.md and docs/HANDOFF.md."

Suggested split: one agent does Stage 0 alone; then A=safe-fetch, B=perf/SEO, C=security checks in parallel on separate branches.

All switch/resume/checkpoint/lane prompts: docs/PROMPTS.md
AI-operator direction: docs/AI-OPERATOR.md (Stage 3)
