# test-area-web

A dump area for interactive visual docs, backend prodding tools, and live Agora
test harnesses. Plain HTML on purpose — no build step, no install, no Vite.
Just open the file in a browser and it works.

## How to use

```bash
# Easiest: open the landing page directly in your browser
open apps/test-area-web/index.html

# Or run a tiny static server if you need fetch() to work without CORS pain
# (Chrome blocks fetch from file:// to http:// — pick one of these):
cd apps/test-area-web && python3 -m http.server 5500
# then visit http://localhost:5500
```

The backend should be running on `http://localhost:8080` (or whatever
`PORT` is set to in `apps/backend/.env`).

## Layout

```
test-area-web/
├── index.html              # landing — links to everything
├── docs/                   # interactive architecture docs (read-only)
├── tools/                  # backend prodding pages (write actions)
├── agora/                  # live Agora SDK test harnesses
└── shared/
    ├── styles.css          # one stylesheet for the whole test area
    └── api.js              # fetch helper, reads API_BASE + ADMIN_TOKEN from localStorage
```

## Conventions

- **One concern per page.** If `agora/two-party-call.html` outgrows itself,
  fork it to `agora/two-party-call-with-recording.html`. Don't add modes.
- **No frameworks.** Vanilla JS, modules via `<script type="module">`. CDN
  imports are fine for SDKs (Agora, mermaid).
- **Settings live in localStorage.** `API_BASE` and `ADMIN_TOKEN` are
  prompted-and-saved on first use, edited via the Settings link in the nav.
  No env files, no rebuilds.
- **Every tools/ page that mutates state shows a confirm dialog with the
  exact request body before sending.** This is dev tooling but money-
  adjacent — measure twice, cut once.
- **Don't deploy this anywhere.** Localhost only. The admin token is the
  whole auth story; if this ships to a public URL we have a problem.

## Adding a new page

1. Pick a folder (`docs/`, `tools/`, `agora/`).
2. Copy the closest existing page as a starting point.
3. Add a link to it from `index.html`.
4. If it talks to the backend, import from `../shared/api.js`.

That's it. No router, no build, no manifest.
