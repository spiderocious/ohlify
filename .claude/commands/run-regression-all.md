---
description: Light regression smoke across all API endpoints — happy paths only, no edge cases. Catches obvious breakage.
---

Invoke the qa-runner agent to run a full-surface regression smoke.

The agent should:

1. **Health check** — `curl -s http://localhost:8082/api/v1/health`. Abort if not ok.

2. **Run the smoke** — `bash tools/qa/regression-smoke.sh`. This script hits one happy-path call per endpoint group across all 5 features (auth, onboarding, profile, banks, rates). Total: ~30-40 fast calls. Should complete in under 60 seconds.

   The smoke script is the single source of truth for "what does it mean for the API to be alive." If it fails to cover an endpoint, fix the script (in [tools/qa/regression-smoke.sh](../../tools/qa/regression-smoke.sh)) instead of hand-rolling curls.

3. **Verify previously-fixed bugs haven't regressed** — read the past findings table in [.claude/agents/qa-runner.md](.claude/agents/qa-runner.md) §"Past findings". For any item marked "fixed", spot-check it.

4. **Write a brief report** — to `docs/qa-reviews/regression-all-<YYYY-MM-DD>.md`:
   - One line per endpoint group: pass / fail / note
   - Any non-2xx that wasn't expected
   - Any previously-fixed bug that has regressed (auto 🔴 HIGH)
   - Total time, total calls, any unusual latency

**Reply to user**: one paragraph. "All <N> endpoint groups smoke-clean" or "Found <X> regressions in <feature>" with paths.

This command is intentionally shallow. Use `/run-diff-test` for depth, `/run-regression-diff` for targeted coverage. Use this one as a heartbeat — before deploys, after refactors, on a daily/weekly schedule.

Pass-through args (if any): $ARGUMENTS