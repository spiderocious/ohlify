# Ohlify

**Paid 1:1 calls with verified professionals.** Ohlify is a Nigerian-Naira marketplace where clients book audio or video consultations with experts — doctors, lawyers, coaches, podcasters — and professionals set their own rates and get paid directly to an in-app wallet.

The core loop: **onboard → discover → book → pay → call → review.** Money is held in escrow when a call is booked and only released to the professional once the call completes; if it falls through, the client is refunded automatically. Calls run over Agora (audio/video), payments over Paystack, and every cent moves through a double-entry wallet ledger.

---

## What's in here

This is the Ohlify **platform monorepo** — one Nx + pnpm workspace holding the backend, two web apps, a marketing site, and the shared packages that tie them together. The **Flutter mobile app** (iOS + Android, the primary client) lives in its own repository and consumes the same API and design language.

| Surface | Stack | Role |
| --- | --- | --- |
| **`apps/backend`** | Node · TypeScript · Express · Postgres · Redis | The API. Auth, bookings, calls, the wallet ledger, payments & refunds, KYC, reviews. |
| **`apps/customer-web`** | React 19 · Vite · TanStack Query | Customer-facing web client. |
| **`apps/admin-web`** | React 19 · Vite · TanStack Query | Internal ops dashboard — KYC review, refunds, transactions, content, audit log. |
| **`apps/website`** | Next.js 15 | Marketing site. |
| **`packages/core`** | TypeScript | Shared domain types, money/time helpers, route table, token storage. |
| **`packages/api`** | TypeScript · Ky | Typed HTTP client, endpoints, and React Query hooks. |
| **`packages/ui`** | React · Tailwind | Design system — primitives, shells, and tokens, mirrored 1:1 by the Flutter app. |

Mobile (separate repo): **Flutter · Provider · go_router · Dio**, sharing the backend contract and the `@ohlify/ui` design language.

## Engineering highlights

- **Double-entry wallet ledger** — append-only, enforced at the database with sum-to-zero and balance-maintenance triggers under advisory locks. Money is stored as `bigint` kobo end-to-end; balances can't drift.
- **Escrow & automatic refunds** — funds are reserved on booking and settled or reversed based on call outcome, with no-show and stuck-call resolution handled by background workers.
- **Transactional outbox** — side effects (emails, push, payouts) are committed atomically with their triggering transaction, then dispatched out-of-band. No lost or double-fired events.
- **Idempotent by design** — composite idempotency keys on mutating endpoints, plus webhook signature verification for Paystack callbacks.
- **One contract, three clients** — the API shape is defined once on the backend and consumed identically by both web apps and the Flutter app through shared typed packages.

## Quick start

```bash
pnpm install
pnpm nx run backend:serve        # API on :8082 (Postgres + Redis required)
pnpm nx run customer-web:dev      # Vite dev server
pnpm nx run admin-web:dev
pnpm nx run website:dev
```

Use Nx for everything — `pnpm nx <target> <project>` (or `nx affected`) for builds, tests, lint, and typecheck across the graph.

---

*Tooling: Nx 22 · pnpm 9 · TypeScript 5.8. Infra: Railway (hosting), Cloudflare R2 (storage), Resend (email).*
