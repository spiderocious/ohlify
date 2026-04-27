---
description: Full QA cycle on the current diff — read changes, write test plan, execute, regression sweep, generate report
---

Invoke the qa-runner agent to run the full diff cycle.

The agent should:

1. **Scope from diff** — `git status --short` to find tracked changes + untracked files.
   - Modified files in `apps/backend/src/features/<feature>/` → that feature is in scope.
   - New `features/<x>/` directories → entirely new feature in scope.
   - Migrations modified → DB-level scenarios in scope.
   - API doc changes → cross-check doc vs code for new deviations.

2. **Read context** —
   - Affected `api-docs/<feature>-apis.md`
   - Affected `apps/backend/src/features/<feature>/{routes,controller,service,schema,repo}.ts`
   - Latest test report for any feature in scope (`docs/qa-reviews/<feature>-test-report*.md`)
   - Past findings table in [.claude/agents/qa-runner.md](.claude/agents/qa-runner.md)

3. **Write the test plan** to `docs/qa-reviews/<scope>-test-plan-<YYYY-MM-DD>.md`:
   - Doc deviations (flag, don't fail)
   - Endpoint inventory with `routes.ts:line` references
   - ~150 scenarios across happy / boundary / auth / role / injection / concurrency / rate-limit
   - Boundary inputs engineered offline where the system has thresholds — port the algorithm to a JS file under [tools/qa/](../../tools/qa/) if needed
   - Open questions (only if blocking)

4. **Execute** — start with the regression sweep (Phase 4 below), then run the full plan. Use [tools/qa/](../../tools/qa/) helpers; extend, don't reinvent.

5. **Regression sweep (always)** — `bash tools/qa/regression-smoke.sh`. Note the result in §0 of the report.

6. **Write the report** to `docs/qa-reviews/<scope>-test-report-<YYYY-MM-DD>.md`. Follow the structure in [docs/qa-reviews/banks-rates-test-report.md](../../docs/qa-reviews/banks-rates-test-report.md). Required:
   - §0 Regression line
   - §1 Pre-flight verification of fixes (only if engineer claimed fixes)
   - §2 Endpoint-by-endpoint results
   - §3 Cross-cutting / security
   - §4 New findings — severity per [.claude/agents/qa-runner.md](.claude/agents/qa-runner.md), one fix direction max
   - §5 Scorecard
   - §6 Must-fix priority list
   - §7 Test artifacts in tools/qa/
   - §8 Open items

**Reply to user**: a short headline summary + path to the report. Lead with anything that needs immediate attention (live 500s, security findings).

Now invoke the qa-runner agent. Pass the user's args (if any) as additional scope hints: $ARGUMENTS