import { useEffect, useMemo, useState } from 'react';

import {
  HawkBadge,
  HawkCaption,
  HawkDrawerHost,
  HawkHeading,
  HawkIcon,
  HawkProvider,
  HawkRegister,
  HawkSearchInput,
  HawkSegmentedControl,
  HawkSwitch,
  HawkText,
  HawkToastHost,
  IconChevronLeft,
  cn,
} from '@ohlify/hawk-ui';

import { HAWK_GROUPS, type HawkPageEntry } from '../parts/registry.js';
import { HAWK_PAGES } from '../parts/hawk-pages.generated.js';

/**
 * The Hawk gallery.
 *
 * Mounted at an unauthenticated `/preview`, deliberately outside the admin
 * app's own provider tree: it makes no API calls, and nesting it under
 * `AppEntrypoint` would inherit the pre-Hawk modal and toast hosts plus a
 * provider that throws at import time without `VITE_API_URL`.
 *
 * Its own `HawkProvider` supplies the ambient contract — masking, reduced
 * motion, register — so every page can be reviewed under all three without
 * anyone changing their OS settings or editing code.
 */
export function HawkPreviewScreen() {
  const slug = useHashSlug();
  const [query, setQuery] = useState('');
  const [masked, setMasked] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [register, setRegister] = useState<HawkRegister>(HawkRegister.PASS);

  const active = HAWK_PAGES.find((page) => page.slug === slug) ?? null;

  // Scroll on slug change rather than inside `open`, so arriving via Back
  // starts at the top too — landing halfway down a page you just returned to
  // is the reason people stop trusting the back button.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  // Navigation writes the URL and nothing else. `useHashSlug` reads it back,
  // so the browser's Back and Forward buttons work exactly as they do anywhere
  // else — which is the only behaviour a reviewer will expect from a link.
  const open = (next: string | null) => {
    if (next) {
      window.location.hash = next;
    } else {
      // Assigning '' would leave a bare '#' in the URL and, worse, would not
      // fire `hashchange` when the hash is already empty. pushState gives a
      // clean /preview and a real history entry.
      window.history.pushState(null, '', window.location.pathname);
      // pushState is silent by design, so the read hook has to be told.
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  return (
    <HawkProvider masked={masked} reducedMotion={reducedMotion} register={register}>
      <div className="min-h-screen bg-hawk-ground">
        <header className="sticky top-0 z-hawk-header border-b border-hawk-line bg-hawk-paper">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-hawk-5 px-hawk-6 py-hawk-4">
            <button
              type="button"
              onClick={() => open(null)}
              className="hawk-focusable flex items-center gap-hawk-3 rounded-hawk-sm"
            >
              {active && <HawkIcon icon={IconChevronLeft} size={16} className="text-hawk-ink-muted" />}
              <HawkText variant="body" ink="strong" className="font-bold">
                Hawk
              </HawkText>
              <HawkBadge label={`${HAWK_PAGES.length} pages`} size="sm" />
            </button>

            <div className="ml-auto flex flex-wrap items-center gap-hawk-5">
              <label className="flex items-center gap-hawk-3">
                <HawkCaption>Mask amounts</HawkCaption>
                <HawkSwitch checked={masked} onChange={setMasked} />
              </label>
              <label className="flex items-center gap-hawk-3">
                <HawkCaption>Reduced motion</HawkCaption>
                <HawkSwitch checked={reducedMotion} onChange={setReducedMotion} />
              </label>
              <HawkSegmentedControl
                size="sm"
                aria-label="Register"
                segments={[
                  { value: HawkRegister.PASS, label: 'PASS' },
                  { value: HawkRegister.BOARD, label: 'BOARD' },
                ]}
                value={register}
                onChange={setRegister}
              />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-hawk-6 py-hawk-8">
          {active ? (
            <ActivePage entry={active} />
          ) : (
            <GalleryIndex query={query} onQueryChange={setQuery} onOpen={open} />
          )}
        </main>

        {/* Hawk's own hosts. The admin app mounts @ohlify/ui's equivalents at
            its root; both can coexist because neither knows about the other. */}
        <HawkToastHost />
        <HawkDrawerHost />
      </div>
    </HawkProvider>
  );
}

function ActivePage({ entry }: { entry: HawkPageEntry }) {
  const Page = entry.component;
  return <Page />;
}

function GalleryIndex({
  query,
  onQueryChange,
  onOpen,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onOpen: (slug: string) => void;
}) {
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return HAWK_PAGES;
    return HAWK_PAGES.filter((page) =>
      // Slug, name, group and state names are all searchable, so "stale" finds
      // every page that anchors a stale tile rather than only pages named for it.
      [page.slug, page.name, page.group, ...page.states]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [query]);

  const grouped = HAWK_GROUPS.map((group) => ({
    group,
    pages: matches.filter((page) => page.group === group),
  })).filter((section) => section.pages.length > 0);

  return (
    <div className="flex flex-col gap-hawk-8">
      <div className="flex flex-col gap-hawk-4">
        <HawkHeading level={1} variant="display">
          Hawk
        </HawkHeading>
        <HawkText variant="body" ink="muted" className="max-w-2xl">
          The design system, every component and every state. Toggle masking,
          reduced motion and the register in the header — every page responds to
          all three.
        </HawkText>
        <div className="max-w-md">
          <HawkSearchInput
            value={query}
            onChange={onQueryChange}
            placeholder="Search components, groups or states"
          />
        </div>
      </div>

      {grouped.length === 0 ? (
        <HawkText variant="body" ink="muted">
          Nothing matches “{query}”.
        </HawkText>
      ) : (
        grouped.map((section) => (
          <section key={section.group} className="flex flex-col gap-hawk-4">
            <div className="flex items-baseline gap-hawk-3">
              <HawkText variant="overline" ink="muted">
                {section.group}
              </HawkText>
              <HawkCaption>{section.pages.length}</HawkCaption>
            </div>
            <div className="grid gap-hawk-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.pages.map((page) => (
                <button
                  key={page.slug}
                  type="button"
                  onClick={() => onOpen(page.slug)}
                  className={cn(
                    'hawk-focusable hawk-motion flex flex-col gap-hawk-3 rounded-hawk-fixed-md',
                    'border border-hawk-line bg-hawk-paper p-hawk-5 text-left',
                    'transition-shadow duration-hawk-fast hover:shadow-hawk-popover',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-hawk-3">
                    <HawkText variant="body" ink="strong" clamp={1} className="font-medium">
                      {page.name}
                    </HawkText>
                    <HawkText variant="tiny" ink="disabled" record>
                      {page.slug}
                    </HawkText>
                  </div>
                  {page.states.length > 0 && (
                    <div className="flex flex-wrap gap-hawk-2">
                      {page.states.map((state) => (
                        <span
                          key={state}
                          className="rounded-hawk-xs bg-hawk-sunken px-hawk-3 py-px text-hawk-tiny text-hawk-ink-muted"
                        >
                          {state}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/**
 * The open page, read from the URL.
 *
 * The URL is the single source of truth — not a copy kept in sync with state.
 * That distinction is what makes browser Back work: pressing it changes the
 * hash, `hashchange` fires, and this hook re-renders with the new value. The
 * earlier version read the hash once in a `useState` initialiser, so Back
 * updated the address bar and left the page showing the previous component.
 *
 * `popstate` is listened to as well, because a Back that pops a `pushState`
 * entry (the return to the index) does not always fire `hashchange`.
 */
function useHashSlug(): string | null {
  const [slug, setSlug] = useState<string | null>(readSlugFromHash);

  useEffect(() => {
    const sync = () => setSlug(readSlugFromHash());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    // The hash can change between first render and this effect running —
    // a deep link that redirects, say. Re-read once to close that window.
    sync();
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  return slug;
}

/** Restores the open page from the URL, so a deep link lands where it should. */
function readSlugFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  return hash.length > 0 ? hash : null;
}
