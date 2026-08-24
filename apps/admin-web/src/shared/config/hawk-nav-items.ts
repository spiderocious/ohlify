import {
  IconBank,
  IconBriefcase,
  IconBroadcast,
  IconCalendar,
  IconChartBar,
  IconFile,
  IconFlag,
  IconHome,
  IconIdCard,
  IconLedger,
  IconLock,
  IconPhone,
  IconReceipt,
  IconSettings,
  IconShield,
  IconStar,
  IconUsers,
  IconWallet,
  type HawkIconComponent,
} from '@ohlify/hawk-ui';

import type { AdminRole } from '@ohlify/api';

import { ADMIN_ROUTES } from '../routes/admin-routes.js';

/**
 * The admin sidebar, grouped.
 *
 * The pre-Hawk sidebar was a flat list of eighteen items. Eighteen is past the
 * point where a flat list is scannable — an operator hunting for "Refunds"
 * reads from the top every time, because nothing tells them which third of the
 * list to look in. A22 groups them, and grouping is the whole reason the
 * redesign touches this file: the items themselves are unchanged.
 *
 * **Declaration order is visual order.** `HawkAdminShell` groups by walking the
 * list and starting a new group whenever `group` changes, deliberately *not*
 * sorting — a sidebar that reorders itself because a group name sorted
 * differently is a sidebar operators have to re-learn. So items sharing a group
 * must be adjacent here, and they are.
 *
 * `roles` is an allowlist; absent means "any admin role". It exists so a
 * support agent is not shown a Wallets entry they would 403 on. The backend
 * still enforces — this is ergonomics, never security.
 */
export interface HawkNavItem {
  key: string;
  label: string;
  icon: HawkIconComponent;
  to: string;
  /** Sidebar section heading. Undefined = ungrouped, pinned at the top. */
  group?: string;
  roles?: readonly AdminRole[];
  /** Match as active only on an exact path (default: prefix match). */
  exact?: boolean;
}

const STAFF: readonly AdminRole[] = ['admin', 'support'];
const FINANCE: readonly AdminRole[] = ['admin', 'finance_ops'];
const ADMIN_ONLY: readonly AdminRole[] = ['admin'];

export const HAWK_NAV_ITEMS: readonly HawkNavItem[] = [
  // Ungrouped, first — the landing surface.
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: IconHome,
    to: ADMIN_ROUTES.DASHBOARD.absPath,
    exact: true,
  },

  // People — who is on the platform, and whether they are who they say.
  { key: 'users', label: 'Users', icon: IconUsers, to: ADMIN_ROUTES.USERS.absPath, group: 'People', roles: STAFF },
  { key: 'kyc', label: 'KYC', icon: IconIdCard, to: ADMIN_ROUTES.KYC.absPath, group: 'People', roles: STAFF },
  { key: 'strikes', label: 'Strikes', icon: IconShield, to: ADMIN_ROUTES.STRIKES.absPath, group: 'People', roles: STAFF },

  // Activity — what happened on the platform.
  { key: 'calls', label: 'Calls', icon: IconPhone, to: ADMIN_ROUTES.CALLS.absPath, group: 'Activity', roles: STAFF },
  { key: 'bookings', label: 'Bookings', icon: IconCalendar, to: ADMIN_ROUTES.BOOKINGS.absPath, group: 'Activity', roles: STAFF },
  { key: 'reviews', label: 'Reviews', icon: IconStar, to: ADMIN_ROUTES.REVIEWS.absPath, group: 'Activity', roles: STAFF },
  { key: 'reports', label: 'Reports', icon: IconFlag, to: ADMIN_ROUTES.REPORTS.absPath, group: 'Activity', roles: STAFF },

  // Money — everything that moves value. Finance-gated as a block.
  { key: 'withdrawals', label: 'Withdrawals', icon: IconBank, to: ADMIN_ROUTES.WITHDRAWALS.absPath, group: 'Money', roles: FINANCE },
  { key: 'refunds', label: 'Refunds', icon: IconReceipt, to: ADMIN_ROUTES.REFUNDS.absPath, group: 'Money', roles: FINANCE },
  { key: 'transactions', label: 'Transactions', icon: IconLedger, to: ADMIN_ROUTES.TRANSACTIONS.absPath, group: 'Money', roles: FINANCE },
  { key: 'wallets', label: 'Wallets', icon: IconWallet, to: ADMIN_ROUTES.WALLETS.absPath, group: 'Money', roles: FINANCE },
  { key: 'webhooks', label: 'Webhooks', icon: IconBriefcase, to: ADMIN_ROUTES.WEBHOOKS.absPath, group: 'Money', roles: FINANCE },

  // Platform — the levers, not the ledger.
  { key: 'content', label: 'Content', icon: IconFile, to: ADMIN_ROUTES.CONTENT.absPath, group: 'Platform', roles: ADMIN_ONLY },
  { key: 'campaigns', label: 'Campaigns', icon: IconBroadcast, to: ADMIN_ROUTES.CAMPAIGNS.absPath, group: 'Platform', roles: ADMIN_ONLY },
  { key: 'releases', label: 'App releases', icon: IconBriefcase, to: ADMIN_ROUTES.APP_RELEASES.absPath, group: 'Platform', roles: ADMIN_ONLY },
  { key: 'config', label: 'Config', icon: IconSettings, to: ADMIN_ROUTES.CONFIG.absPath, group: 'Platform', roles: ADMIN_ONLY },
  // A diagnostic surface rather than a daily one — hence the bottom of the
  // Platform group, next to the audit log, rather than beside the dashboard.
  { key: 'technical', label: 'Technical', icon: IconChartBar, to: ADMIN_ROUTES.TECHNICAL.absPath, group: 'Platform', roles: ADMIN_ONLY },
  { key: 'audit', label: 'Audit log', icon: IconLock, to: ADMIN_ROUTES.AUDIT_LOG.absPath, group: 'Platform', roles: ADMIN_ONLY },
];

export function visibleHawkNavItems(role: AdminRole | undefined): HawkNavItem[] {
  if (!role) return [];
  return HAWK_NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

/**
 * Which nav item the current URL belongs to.
 *
 * Longest matching prefix wins, so `/wallets/journals` resolves to Wallets
 * rather than to whichever wallet-prefixed item happened to be declared first.
 * Dashboard opts out of prefix matching (`exact`) — it sits at a path every
 * other route would otherwise match against.
 */
export function activeNavKey(pathname: string, items: readonly HawkNavItem[]): string | undefined {
  let best: HawkNavItem | undefined;
  for (const item of items) {
    const hit = item.exact
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`);
    if (!hit) continue;
    if (!best || item.to.length > best.to.length) best = item;
  }
  return best?.key;
}
