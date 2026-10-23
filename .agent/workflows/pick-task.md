---
description: Pick and complete the next unclaimed task
---
1. Read AGENTS.md.
2. Open docs/TASKS.md; choose the first unclaimed task whose dependencies are ticked.
3. Claim it (append claimed tag). Create branch agent/<task-id>-<slug>.
4. Open only the doc named in the task's "Spec" field.
5. Implement within listed paths, with tests.
6. Run pnpm typecheck && pnpm lint && pnpm test.
7. Tick task, append to docs/HANDOFF.md, commit.
