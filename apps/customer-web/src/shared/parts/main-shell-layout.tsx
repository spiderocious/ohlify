import { Show } from 'meemaw';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppHeader, AppShell, appMainNavItems } from '@ohlify/ui';

import { RoutePrefetchWatcher } from '../prefetch/index.js';
import { JoinableCallBanner } from './joinable-call-banner.js';
import { KycReviewBanner } from './kyc-review-banner.js';

const TAB_PATHS = [
  ROUTES.HOME.absPath,
  ROUTES.CALLS.absPath,
  ROUTES.WALLET.absPath,
  ROUTES.PROFILE.absPath,
];

/**
 * Mirrors mobile's AppShell — bottom nav (mobile) / sidebar (desktop) on the
 * four root tab routes, top header only on Home (matching the Flutter
 * `showHeader = activeIndex == 0` rule).
 */
export function MainShellLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeIndex = (() => {
    for (let i = 0; i < TAB_PATHS.length; i++) {
      const root = TAB_PATHS[i];
      if (root && (location.pathname === root || location.pathname.startsWith(`${root}/`))) {
        return i;
      }
    }
    return 0;
  })();

  const isHome = activeIndex === 0;

  return (
    <AppShell
      items={appMainNavItems}
      currentIndex={activeIndex}
      onTap={(i) => {
        const path = TAB_PATHS[i];
        if (path) navigate(path);
      }}
      header={
        <>
          {/* Joinable-call banner sits above KYC review because an
              actionable incoming call should out-rank an info-only
              "your KYC is under review" notice. */}
          <JoinableCallBanner />
          <KycReviewBanner />
          <Show when={isHome}>
            <AppHeader
              notificationCount={1}
              onNotification={() => navigate(ROUTES.NOTIFICATIONS.absPath)}
              shareUrl="https://ohlify.com/jocelyn-aminoff"
            />
          </Show>
        </>
      }
    >
      <RoutePrefetchWatcher />
      <Outlet />
    </AppShell>
  );
}
