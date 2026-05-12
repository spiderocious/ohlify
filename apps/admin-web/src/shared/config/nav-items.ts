import {
  IconAlertTriangle,
  IconBriefcase,
  IconCalendar,
  IconCreditCard,
  IconFileText,
  IconHome,
  IconIdCard,
  IconLock,
  IconPhone,
  IconSettings,
  IconShield,
  IconStar,
  IconUsers,
  IconWallet,
  type LucideIcon,
} from '@icons';

import type { AdminRole } from '@ohlify/api';

import { ADMIN_ROUTES } from '../routes/admin-routes.js';

/**
 * One row per top-level destination in the admin sidebar.
 *
 * `roles` is an allowlist — empty/missing means "any admin role". The role
 * gate exists so support agents don't see a Wallet sidebar entry that they'd
 * 403 on; backend still enforces (this is only ergonomic).
 *
 * Order of this list IS the visual order in the sidebar.
 */
export interface AdminNavItem {
  label: string;
  Icon: LucideIcon;
  to: string;
  roles?: readonly AdminRole[];
  /** Match this item as active for any path starting with `to` (default true). */
  matchPrefix?: boolean;
}

const STAFF: readonly AdminRole[] = ['admin', 'support'];
const FINANCE: readonly AdminRole[] = ['admin', 'finance_ops'];
const ADMIN_ONLY: readonly AdminRole[] = ['admin'];

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { label: 'Dashboard',     Icon: IconHome,           to: ADMIN_ROUTES.DASHBOARD.absPath },
  { label: 'Users',         Icon: IconUsers,          to: ADMIN_ROUTES.USERS.absPath,        roles: STAFF },
  { label: 'KYC',           Icon: IconIdCard,         to: ADMIN_ROUTES.KYC.absPath,          roles: STAFF },
  { label: 'Calls',         Icon: IconPhone,          to: ADMIN_ROUTES.CALLS.absPath,        roles: STAFF },
  { label: 'Bookings',      Icon: IconCalendar,       to: ADMIN_ROUTES.BOOKINGS.absPath,     roles: STAFF },
  { label: 'Withdrawals',   Icon: IconCreditCard,     to: ADMIN_ROUTES.WITHDRAWALS.absPath,  roles: FINANCE },
  { label: 'Refunds',       Icon: IconCreditCard,     to: ADMIN_ROUTES.REFUNDS.absPath,      roles: FINANCE },
  { label: 'Transactions',  Icon: IconCreditCard,     to: ADMIN_ROUTES.TRANSACTIONS.absPath, roles: FINANCE },
  { label: 'Wallets',       Icon: IconWallet,         to: ADMIN_ROUTES.WALLETS.absPath,      roles: FINANCE },
  { label: 'Webhooks',      Icon: IconBriefcase,      to: ADMIN_ROUTES.WEBHOOKS.absPath,     roles: FINANCE },
  { label: 'Reports',       Icon: IconAlertTriangle,  to: ADMIN_ROUTES.REPORTS.absPath,      roles: STAFF },
  { label: 'Reviews',       Icon: IconStar,           to: ADMIN_ROUTES.REVIEWS.absPath,      roles: STAFF },
  { label: 'Strikes',       Icon: IconShield,         to: ADMIN_ROUTES.STRIKES.absPath,      roles: STAFF },
  { label: 'Content',       Icon: IconFileText,       to: ADMIN_ROUTES.CONTENT.absPath,      roles: ADMIN_ONLY },
  { label: 'Config',        Icon: IconSettings,       to: ADMIN_ROUTES.CONFIG.absPath,       roles: ADMIN_ONLY },
  { label: 'Audit log',     Icon: IconLock,           to: ADMIN_ROUTES.AUDIT_LOG.absPath,    roles: ADMIN_ONLY },
];

export function visibleNavItems(role: AdminRole | undefined): AdminNavItem[] {
  if (!role) return [];
  return ADMIN_NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
