---
description: Targeted regression on APIs that could have been affected by the current diff (direct + transitive)
---

Invoke the qa-runner agent to run a regression sweep scoped to the diff's blast radius.

This is the middle ground between `/run-regression-all` (full surface, shallow) and `/run-diff-test` (full depth on the diff). Use it when you've made a change and want broad-but-cheap confidence that you haven't broken downstream consumers.

The agent should:

1. **Determine the blast radius** —
   - Direct: any feature whose `apps/backend/src/features/<x>/` was touched.
   - Transitive: features that **depend on** the touched files. For ohlify backend specifically:
     - Touched `lib/redis/rateLimit.ts` → all rate-limited routes (most of them).
     - Touched `lib/http/{validateRequest,bail,asyncHandler}.ts` → every route.
     - Touched `middlewares/{auth,errorHandler}.middleware.ts` → every protected route.
     - Touched `lib/security/{jwt,password}.ts` → auth + every Bearer endpoint.
     - Touched `lib/paystack/client.ts` → banks (resolve) + profile (PUT bank-account).
     - Touched `lib/util/string-similarity.ts` → profile (PUT bank-account name-match).
     - Touched `lib/config/platform-config.service.ts` → rates (price/duration), profile (name-match threshold), onboarding (handle cooldown).
     - Touched `shared/constants/error-codes.ts` → every error path. Run full smoke.
     - Touched migrations → potentially every endpoint that uses the changed table.
     - Touched any `features/<feature>/repo.ts` → just that feature.
   - When in doubt, widen scope. False positives in scope cost a few seconds; missed regressions cost real bugs.

2. **Health check** — abort if server is down.

3. **Run scoped regression** — `bash tools/qa/regression-smoke.sh <feature1> <feature2> ...`. The smoke script accepts feature names as args; with none, runs everything. With args, runs only the specified groups.

4. **Add boundary smoke for the affected feature(s)** — beyond the basic happy path, run a small set of boundary checks:
   - For auth: register-flow happy path, login wrong/right password, logout.
   - For onboarding: a status read, a role set, a KYC patch, a handle check.
   - For profile: GET /me, PATCH /me with one field, sensitive-action OTP request.
   - For banks: list (cached + revalidated), one resolve.
   - For rates: list, create, patch, delete.

5. **Spot-check previously-fixed bugs in scope** — see [.claude/agents/qa-runner.md](.claude/agents/qa-runner.md) §"Past findings".

6. **Report** to `docs/qa-reviews/regression-diff-<YYYY-MM-DD>.md`:
   - Diff scope summary (what was touched)
   - Computed blast radius (which features pulled in)
   - Endpoint smoke results
   - Any regression of previously-fixed bugs (🔴 HIGH)
   - Anomalies worth a deeper /run-diff-test pass

**Reply to user**: short paragraph. "Diff touched <X>, smoke covered <Y> endpoints across <N> features. Clean / found <Z>." Path to the report.

Pass-through args (if any): $ARGUMENTS