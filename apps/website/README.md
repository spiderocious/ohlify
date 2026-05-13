# `@ohlify/website`

The marketing site for Ohlify, hosted at `https://ohlify.com`. Built with Next.js 15 (App Router) + React 19 + Tailwind, sharing the `@ohlify/ui` design system with `customer-web` so brand parity is automatic.

## Why a separate app

- `customer-web` is a Vite SPA — fast for the in-app surface, but heavy for first paint of a marketing page.
- The landing page is SSR-first (LCP < 1.5s on 4G), the customer-web shell is client-first (hydrate, then work).
- Domain split: `ohlify.com` (this app) for marketing, `app.ohlify.com` (customer-web) for the product. The middleware redirects any unknown root-level path to the app so existing share links like `ohlify.com/jocelyn-aminoff` keep resolving.

## Run

```bash
# from repo root
pnpm install
pnpm --filter @ohlify/website dev   # http://localhost:3001
```

The dev server reads `@ohlify/ui` + `@ohlify/core` directly from the workspace — no need to prebuild the packages.

## Build

```bash
pnpm --filter @ohlify/website build
pnpm --filter @ohlify/website start  # production server, port 3001
```

## Edit copy / data

Most marketing copy is centralized in either `src/lib/site-config.ts` (hero, CTAs, social links) or `src/data/*.json` (features list, FAQ, fake professional personas for the screenshots + demo). Editing the JSON is a no-deploy change in dev; for prod, push a commit.

The interactive demo's state machine lives in `src/components/demo/demo-state.ts`. The 5 panels (browse, details, schedule, pay, call, end) are in `src/components/demo/demo-panels.tsx`.

## Deploy

Netlify. Two Netlify sites total:

| Site | Domain | Backend |
|---|---|---|
| `customer-web` | `app.ohlify.com` | This repo, `apps/customer-web` |
| `website` (this app) | `ohlify.com` + `www.ohlify.com` | This repo, `apps/website` |

`netlify.toml` in this directory tells Netlify what to build and which plugin to use. The repository-level `base` is `apps/website` so the build is scoped.

DNS:
- `ohlify.com` → Netlify (apex)
- `www.ohlify.com` → Netlify (CNAME)
- `app.ohlify.com` → Netlify (CNAME)

## Performance budget

- LCP < 1.5s on 4G mobile.
- Initial JS payload < 80KB compressed (excluding fonts).
- Interactive demo lazy-loads after hero paints (dynamic import, `ssr: false`).
- Hero owns the LCP and is pure HTML — no JS dependency for first paint.
- Reveal-on-scroll runs through a single `IntersectionObserver`, not Framer.

## Adding a new section

1. Create a component in `src/components/marketing/<name>.tsx`.
2. Use `<SectionShell>` for the standard intro + spacing.
3. Add it to `app/page.tsx`.
4. Anything you want to fade in on scroll needs the `reveal-on-scroll` class.

## What this app does NOT do

- No CMS — copy lives in code/JSON.
- No blog.
- No A/B testing.
- No real auth / API calls — the demo is a pure client state machine.

Add those when there's a real business reason. Today, ship the page.
