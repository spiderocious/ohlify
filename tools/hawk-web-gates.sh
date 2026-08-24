#!/usr/bin/env bash
# Hawk (web) isolation gates.
#
# Hawk is additive: it must be possible to delete `packages/hawk-ui/` and
# `apps/admin-web/src/features/hawk-preview/` and have the admin app build
# unchanged. These checks prove that, and are cheap enough to run on every
# commit.
#
# Run from the repo root:  bash tools/hawk-web-gates.sh

set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
pass() { printf '  PASS  %s\n' "$1"; }
bad()  { printf '  FAIL  %s\n' "$1"; fail=1; }

echo "Hawk (web) isolation gates"
echo

# 1 — Hawk must not depend on the pre-Hawk UI. Comments are excluded: several
#     files legitimately *mention* the old package when explaining why they do
#     not import it.
hits=$(grep -rnE "^\s*import .*'@ohlify/(ui|api|core)" packages/hawk-ui/src/ 2>/dev/null || true)
if [ -z "$hits" ]; then
  pass "hawk-ui imports nothing from @ohlify/ui, /api or /core"
else
  bad "hawk-ui depends on another workspace package:"; echo "$hits"
fi

# 1b — The same claim at the manifest level, so the package manager enforces
#      it too. The package's own `name` field is excluded, obviously.
hits=$(grep -n '"@ohlify/' packages/hawk-ui/package.json 2>/dev/null \
  | grep -v '"name":' || true)
if [ -z "$hits" ]; then
  pass "hawk-ui declares no @ohlify workspace dependency"
else
  bad "packages/hawk-ui/package.json declares an @ohlify dependency:"; echo "$hits"
fi

# 2 — Only the gallery and MIGRATED surfaces may import Hawk.
#
# This gate began life as "no live file imports Hawk", which was right while
# Hawk was unproven. It is now the migration ledger: a surface joins the
# allowlist below in the same commit that migrates it, so the gate keeps
# protecting every screen that has NOT moved yet while saying out loud which
# ones have. An import from anywhere else is still a failure.
#
# `main.tsx` is a seam rather than a migration: it imports the *stylesheet*,
# which is what makes the tokens available. A component import there still fails.
#
# MIGRATED (keep this list and docs/redesign/hawk-web-migration.md in step):
#   shared/parts/admin-shell, admin-sidebar, admin-topbar  — the global shell
#   shared/config/hawk-nav-items                           — the grouped nav
#   shared/parts/board-skeletons                           — shared loading shapes
#   shared/parts/board-screen, board-status                — shared list scaffold
#   features/dashboard/                                    — A22
#   features/technical/                                    — technical board
#   features/users/                                        — list + detail
migrated_re="^apps/admin-web/src/(features/hawk-preview/|features/dashboard/|features/technical/|features/users/|features/withdrawals/|features/refunds/|features/transactions/|features/kyc/screens/kyc-(list|detail)-screen\.tsx|features/reports/|features/reviews/screens/|features/strikes/screens/|features/calls/screens/|features/wallet/screens/|features/audit-log/|features/webhooks/|features/campaigns/screens/|features/app-releases/screens/|features/config/screens/|features/content/screens/|shared/parts/(admin-(shell|sidebar|topbar)|board-skeletons|board-screen)\.tsx|shared/parts/board-status\.ts|shared/config/hawk-nav-items\.ts)"
hits=$(grep -rnE "@ohlify/hawk-ui" apps/admin-web/src/ 2>/dev/null \
  | grep -vE "$migrated_re" \
  | grep -v "^apps/admin-web/src/main.tsx:.*hawk-ui/styles.css" || true)
if [ -z "$hits" ]; then
  pass "only the gallery + migrated surfaces import hawk-ui"
else
  bad "an unmigrated admin-web file imports hawk-ui:"; echo "$hits"
fi

# 3 — The pre-Hawk UI package is untouched by this work.
# `add-rate-form` carries pre-existing uncommitted work that predates Hawk and
# is unrelated to it — excluded here exactly as the Flutter gate excludes its
# counterpart.
hits=$(git status --porcelain packages/ui 2>/dev/null \
  | grep -v "add-rate-form" || true)
if [ -z "$hits" ]; then
  pass "packages/ui carries no Hawk changes"
else
  bad "packages/ui was modified:"; echo "$hits"
fi

# 4 — The app root is untouched: the global toast/modal hosts and the provider
#     must keep working exactly as they did.
hits=$(git status --porcelain \
  apps/admin-web/src/app.provider.tsx \
  apps/admin-web/src/app.entrypoint.tsx \
  apps/admin-web/src/app.tsx \
  apps/admin-web/src/styles/index.css 2>/dev/null || true)
if [ -z "$hits" ]; then
  pass "app.provider, app.entrypoint, app.tsx and the stylesheet are untouched"
else
  bad "the app root was modified:"; echo "$hits"
fi

# 5 — /preview must not sit under AuthGuard, and must not be a child of
#     AppEntrypoint. Nesting it would mount AppProvider — which throws at module
#     scope without VITE_API_URL — plus the pre-Hawk overlay hosts.
if grep -q "^  { path: '/preview/\*'" apps/admin-web/src/app.routes.tsx 2>/dev/null; then
  pass "/preview is a top-level route, outside AppEntrypoint and AuthGuard"
else
  bad "/preview is not mounted as a top-level sibling route"
fi

# 6 — The gallery registry is generated, so it must match what is on disk.
if node tools/hawk-pages.mjs --check >/dev/null 2>&1; then
  pass "hawk-pages.generated.ts is in sync with the parts on disk"
else
  bad "hawk-pages.generated.ts is stale — run: node tools/hawk-pages.mjs"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "All gates passed."
else
  echo "One or more gates failed."
fi
exit "$fail"
