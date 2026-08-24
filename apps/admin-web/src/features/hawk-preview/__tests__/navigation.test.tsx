import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HawkPreviewScreen } from '../screens/hawk-preview-screen.js';
import { HAWK_PAGES } from '../parts/hawk-pages.generated.js';

/**
 * Gallery navigation.
 *
 * These exist because the render sweep could not have caught the bug they
 * guard: every page rendered perfectly in isolation, but the screen read the
 * URL hash exactly once — in a `useState` initialiser — so pressing browser
 * Back changed the address bar and left the previous component on screen.
 *
 * The fix made the URL the single source of truth rather than a copy kept in
 * sync with state. The tests below assert that property directly, by driving
 * the URL the way a browser does and checking what renders.
 */
describe('gallery navigation follows the URL', () => {
  const first = HAWK_PAGES[0]!;

  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.history.replaceState(null, '', '/preview');
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/preview');
  });

  /** Changes the hash the way a browser does, events included. */
  function navigate(hash: string) {
    act(() => {
      window.location.hash = hash;
      // jsdom updates `location` but does not always dispatch, so the event a
      // real browser would fire is dispatched explicitly.
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  }

  it('shows the index when the URL carries no hash', () => {
    render(<HawkPreviewScreen />);
    expect(screen.getByPlaceholderText('Search components, groups or states')).toBeDefined();
  });

  it('opens the page named in the hash on first render — a deep link works', () => {
    window.history.replaceState(null, '', `/preview#${first.slug}`);
    render(<HawkPreviewScreen />);
    expect(screen.queryByPlaceholderText('Search components, groups or states')).toBeNull();
  });

  it('follows a hash change — this is what browser Back does', () => {
    render(<HawkPreviewScreen />);

    navigate(`#${first.slug}`);
    expect(
      screen.queryByPlaceholderText('Search components, groups or states'),
      'a hash pointing at a page should replace the index',
    ).toBeNull();

    // The regression: Back clears the hash, and the index must come back.
    navigate('');
    expect(
      screen.getByPlaceholderText('Search components, groups or states'),
      'clearing the hash must restore the index — the browser Back case',
    ).toBeDefined();
  });

  it('follows a hash change between two pages', () => {
    const second = HAWK_PAGES[1]!;
    window.history.replaceState(null, '', `/preview#${first.slug}`);
    render(<HawkPreviewScreen />);

    navigate(`#${second.slug}`);
    expect(screen.queryByPlaceholderText('Search components, groups or states')).toBeNull();
  });

  it('falls back to the index for a hash that names no page', () => {
    // A stale link from a renamed specimen must not render a blank screen.
    window.history.replaceState(null, '', '/preview#not-a-real-slug');
    render(<HawkPreviewScreen />);
    expect(screen.getByPlaceholderText('Search components, groups or states')).toBeDefined();
  });

  it('reacts to popstate as well as hashchange', () => {
    render(<HawkPreviewScreen />);

    navigate(`#${first.slug}`);
    expect(screen.queryByPlaceholderText('Search components, groups or states')).toBeNull();

    // Returning to the index uses pushState, so the pop that undoes it can
    // arrive as popstate rather than hashchange.
    act(() => {
      window.history.replaceState(null, '', '/preview');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByPlaceholderText('Search components, groups or states')).toBeDefined();
  });
});
