import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HawkProvider } from '@ohlify/hawk-ui';

import { HAWK_PAGES } from '../parts/hawk-pages.generated.js';
import { HAWK_GROUPS } from '../parts/registry.js';

/**
 * The render sweep.
 *
 * The type-checker cannot see a null-deref in a builder, an unbounded-constraint
 * crash, a `setState` on an unmounted component, or a component that throws
 * because a required child is missing. All of those are runtime failures on a
 * page that compiles perfectly.
 *
 * On the Flutter side the equivalent test caught two real bugs immediately — a
 * `setState` on a defunct element that would have crashed in production, and two
 * layout overflows. Pumping every page is the cheapest way to catch that class
 * of failure, and it means "it is in the gallery" also means "it renders".
 *
 * Console errors fail the test too. React reports key collisions, invalid DOM
 * nesting and prop-type violations through `console.error` rather than by
 * throwing, so a sweep that ignores it would pass over exactly the problems
 * that are easiest to fix and easiest to miss.
 */
describe('the gallery renders', () => {
  let errors: string[] = [];
  let originalError: typeof console.error;

  beforeEach(() => {
    errors = [];
    originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    };
    // jsdom implements neither, and several Hawk surfaces call them on mount.
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    cleanup();
  });

  it('registers at least one page', () => {
    expect(HAWK_PAGES.length).toBeGreaterThan(0);
  });

  it('gives every page a unique slug — a duplicate makes search ambiguous', () => {
    const slugs = HAWK_PAGES.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('puts every page in a known group', () => {
    for (const page of HAWK_PAGES) {
      expect(HAWK_GROUPS, `${page.slug} sits in an unknown group "${page.group}"`).toContain(
        page.group,
      );
    }
  });

  it('gives every page a slug and a name', () => {
    for (const page of HAWK_PAGES) {
      expect(page.slug.length).toBeGreaterThan(0);
      expect(page.name.length).toBeGreaterThan(0);
    }
  });

  for (const page of HAWK_PAGES) {
    it(`${page.group} · ${page.name} (${page.slug})`, () => {
      const Page = page.component;
      expect(() =>
        render(
          <HawkProvider>
            <Page />
          </HawkProvider>,
        ),
      ).not.toThrow();
      expect(errors, `${page.slug} logged a console error`).toEqual([]);
    });
  }

  it('renders every page with masking on — the layout must not break', () => {
    for (const page of HAWK_PAGES) {
      const Page = page.component;
      expect(() =>
        render(
          <HawkProvider masked>
            <Page />
          </HawkProvider>,
        ),
      ).not.toThrow();
      cleanup();
    }
    expect(errors).toEqual([]);
  });

  it('renders every page in the BOARD register', () => {
    for (const page of HAWK_PAGES) {
      const Page = page.component;
      expect(() =>
        render(
          <HawkProvider register="board">
            <Page />
          </HawkProvider>,
        ),
      ).not.toThrow();
      cleanup();
    }
    expect(errors).toEqual([]);
  });

  it('renders every page with reduced motion', () => {
    for (const page of HAWK_PAGES) {
      const Page = page.component;
      expect(() =>
        render(
          <HawkProvider reducedMotion>
            <Page />
          </HawkProvider>,
        ),
      ).not.toThrow();
      cleanup();
    }
    expect(errors).toEqual([]);
  });
});
