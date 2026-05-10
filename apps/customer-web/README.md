# @ohlify/customer-web

Customer-facing web app. Mirrors the Flutter mobile app's current state — UI-first, mock-data-driven, no API calls in v1. The same React build powers small-screen mobile and a desktop redesign at `≥lg`.

## Run

```bash
pnpm install
pnpm nx serve customer-web   # http://localhost:5173
pnpm nx build customer-web   # production build → dist/
```

Lint and typecheck:

```bash
pnpm nx typecheck customer-web
pnpm nx lint customer-web
```

To run everything in the workspace at once:

```bash
pnpm nx run-many -t typecheck --projects=core,ui,api,customer-web,admin-web
pnpm nx run-many -t lint      --projects=core,ui,api,customer-web,admin-web
pnpm nx run-many -t build     --projects=customer-web,admin-web
```

## Layout

This app follows Feature-Sliced Design (see [docs/web-guide/guide.md](../../docs/web-guide/guide.md)).

```
src/
├── app.tsx                       # mounts <RouterProvider>
├── app.routes.tsx                # typed-route table; every screen lazy-loaded
├── app.entrypoint.tsx            # global providers + ModalHost + ToastHost
├── app.provider.tsx              # global providers wrapper
├── features/                     # one folder per feature, FSD
│   ├── splash/
│   ├── onboarding/
│   ├── auth-register/            # /register, /register/create-password, /register/verify-otp
│   ├── auth-login/
│   ├── auth-forgot-password/
│   ├── role-selection/
│   ├── client-kyc/
│   ├── professional-kyc/         # parent layout owns provider; /professional-kyc/rates is a child
│   ├── home/
│   ├── professional-search/
│   ├── professional-details/
│   ├── schedule-call/
│   ├── calls/
│   ├── call-details/
│   ├── call-session/             # mock RTC engine + 5-phase flow + emoji feedback
│   ├── wallet/
│   ├── notifications/
│   ├── profile/                  # parent layout + 9 sub-screens
│   ├── component-preview/        # in-route gallery for every primitive/widget/modal/meemaw helper
│   └── welcome/                  # post-splash welcome; not part of the prod flow
└── shared/
    └── parts/
        ├── auth-screen-shell.tsx # shared auth scaffold (back, logo, title, subtitle, sticky CTA)
        └── main-shell-layout.tsx # wraps the four tab routes in <AppShell>
```

## Conventions

These are non-negotiable. They flow from `docs/web-guide/web-build-plan.md` §5.

- **Icons via `@icons` proxy only.** Never `from 'lucide-react'`. Add new icons to [packages/ui/src/icons/index.ts](../../packages/ui/src/icons/index.ts).
- **Typed routes via `ROUTES` from `@ohlify/core`.** Use `ROUTES.X.absPath` for `<Navigate>` / `<Link to>` and `ROUTES.PROFESSIONAL.build({ id })` to substitute path params.
- **No global state library.** React Context + Tanstack Query (later) cover everything.
- **`meemaw` for declarative conditional/list rendering.** Reach for `<Show>`, `<Hidden>`, `<Switch>/<Case>/<Default>`, `<Repeat>`, `<Loadable>`, `<CopyToClipboard>`, `<Clamp>` before hand-rolling.
- **Mocks live in `@ohlify/core/mocks`.** When real APIs land they swap in behind the same component interfaces.
- **Mobile parity is the contract.** Every feature folder mirrors `mobile/lib/features/<name>/`. If a screen looks different from the Flutter app, it's a bug.
- **Money is bigint kobo at type boundaries.** Format at render via `formatNaira()`.
- **Lazy-load every route.** See [app.routes.tsx](src/app.routes.tsx).
- **Hyphenated filenames.** `client-kyc-screen.tsx`, never `ClientKycScreen.tsx`.

## Component preview

`/component-preview` is an in-app gallery of every primitive, widget, modal, and meemaw helper. Use it as the spot to verify visual parity vs the Flutter app while iterating.

## What's stubbed in v1

Per [docs/web-guide/web-build-plan.md](../../docs/web-guide/web-build-plan.md) §1.3:

- All API calls. Mocks from `@ohlify/core/mocks` ship instead.
- Real Agora RTC. The call-session feature uses a mock engine with auto-advancing phase timers.
- Push notifications / WebSocket realtime.
- File uploads.
- Auth / token storage.
- i18n (English-only, structured for future localization).

These all land behind the same component interfaces in later phases.
