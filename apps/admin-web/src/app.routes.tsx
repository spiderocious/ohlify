import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { AdminRole } from '@ohlify/api';

import { AppEntrypoint } from './app.entrypoint.js';
import { AuthGuard } from './shared/guards/auth-guard.js';
import { RoleGuard } from './shared/guards/role-guard.js';
import { AdminShell } from './shared/parts/admin-shell.js';
import { ADMIN_ROUTES } from './shared/routes/admin-routes.js';

const STAFF = [AdminRole.ADMIN, AdminRole.SUPPORT] as const;
const FINANCE = [AdminRole.ADMIN, AdminRole.FINANCE_OPS] as const;
const ADMIN_ONLY = [AdminRole.ADMIN] as const;

// Auth screens
const LoginScreen = lazy(() =>
  import('./features/auth/screens/login-screen.js').then((m) => ({ default: m.LoginScreen })),
);
const TotpSetupScreen = lazy(() =>
  import('./features/auth/screens/totp-setup-screen.js').then((m) => ({
    default: m.TotpSetupScreen,
  })),
);

// Module screens
const DashboardScreen = lazy(() =>
  import('./features/dashboard/screens/dashboard-screen.js').then((m) => ({
    default: m.DashboardScreen,
  })),
);
const UsersListScreen = lazy(() =>
  import('./features/users/screens/users-list-screen.js').then((m) => ({
    default: m.UsersListScreen,
  })),
);
const UserDetailScreen = lazy(() =>
  import('./features/users/screens/user-detail-screen.js').then((m) => ({
    default: m.UserDetailScreen,
  })),
);
const KycListScreen = lazy(() =>
  import('./features/kyc/screens/kyc-list-screen.js').then((m) => ({ default: m.KycListScreen })),
);
const KycDetailScreen = lazy(() =>
  import('./features/kyc/screens/kyc-detail-screen.js').then((m) => ({
    default: m.KycDetailScreen,
  })),
);
const CallsListScreen = lazy(() =>
  import('./features/calls/screens/calls-list-screen.js').then((m) => ({
    default: m.CallsListScreen,
  })),
);
const BookingsListScreen = lazy(() =>
  import('./features/calls/screens/bookings-list-screen.js').then((m) => ({
    default: m.BookingsListScreen,
  })),
);
const WithdrawalsListScreen = lazy(() =>
  import('./features/withdrawals/screens/withdrawals-list-screen.js').then((m) => ({
    default: m.WithdrawalsListScreen,
  })),
);
const RefundsListScreen = lazy(() =>
  import('./features/refunds/screens/refunds-list-screen.js').then((m) => ({
    default: m.RefundsListScreen,
  })),
);
const TransactionsListScreen = lazy(() =>
  import('./features/transactions/screens/transactions-list-screen.js').then((m) => ({
    default: m.TransactionsListScreen,
  })),
);
const WalletOverviewScreen = lazy(() =>
  import('./features/wallet/screens/wallet-overview-screen.js').then((m) => ({
    default: m.WalletOverviewScreen,
  })),
);
const SystemAccountsScreen = lazy(() =>
  import('./features/wallet/screens/system-accounts-screen.js').then((m) => ({
    default: m.SystemAccountsScreen,
  })),
);
const JournalsListScreen = lazy(() =>
  import('./features/wallet/screens/journals-list-screen.js').then((m) => ({
    default: m.JournalsListScreen,
  })),
);
const ReconciliationScreen = lazy(() =>
  import('./features/wallet/screens/reconciliation-screen.js').then((m) => ({
    default: m.ReconciliationScreen,
  })),
);
const ManualJournalScreen = lazy(() =>
  import('./features/wallet/screens/manual-journal-screen.js').then((m) => ({
    default: m.ManualJournalScreen,
  })),
);
const UserWalletScreen = lazy(() =>
  import('./features/wallet/screens/user-wallet-screen.js').then((m) => ({
    default: m.UserWalletScreen,
  })),
);
const WebhooksListScreen = lazy(() =>
  import('./features/webhooks/screens/webhooks-list-screen.js').then((m) => ({
    default: m.WebhooksListScreen,
  })),
);
const ReportsListScreen = lazy(() =>
  import('./features/reports/screens/reports-list-screen.js').then((m) => ({
    default: m.ReportsListScreen,
  })),
);
const BannersScreen = lazy(() =>
  import('./features/content/screens/banners-screen.js').then((m) => ({
    default: m.BannersScreen,
  })),
);
const LegalScreen = lazy(() =>
  import('./features/content/screens/legal-screen.js').then((m) => ({ default: m.LegalScreen })),
);
const FaqsScreen = lazy(() =>
  import('./features/content/screens/faqs-screen.js').then((m) => ({ default: m.FaqsScreen })),
);
const CampaignsScreen = lazy(() =>
  import('./features/campaigns/screens/campaigns-screen.js').then((m) => ({
    default: m.CampaignsScreen,
  })),
);
const AppReleasesScreen = lazy(() =>
  import('./features/app-releases/screens/app-releases-screen.js').then((m) => ({
    default: m.AppReleasesScreen,
  })),
);
const ConfigScreen = lazy(() =>
  import('./features/config/screens/config-screen.js').then((m) => ({ default: m.ConfigScreen })),
);
const TechnicalScreen = lazy(() =>
  import('./features/technical/screens/technical-screen.js').then((m) => ({
    default: m.TechnicalScreen,
  })),
);
const AuditLogScreen = lazy(() =>
  import('./features/audit-log/screens/audit-log-screen.js').then((m) => ({
    default: m.AuditLogScreen,
  })),
);
const ReviewsListScreen = lazy(() =>
  import('./features/reviews/screens/reviews-list-screen.js').then((m) => ({
    default: m.ReviewsListScreen,
  })),
);
// The Hawk gallery. Unauthenticated, and deliberately NOT nested under
// AppEntrypoint — see the route below.
const HawkPreviewScreen = lazy(() =>
  import('./features/hawk-preview/screens/hawk-preview-screen.js').then((m) => ({
    default: m.HawkPreviewScreen,
  })),
);

const StrikesListScreen = lazy(() =>
  import('./features/strikes/screens/strikes-list-screen.js').then((m) => ({
    default: m.StrikesListScreen,
  })),
);

function lazyRoute(element: ReactElement): ReactElement {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted">Loading…</div>}>{element}</Suspense>
  );
}

const routes: RouteObject[] = [
  // The Hawk design-system gallery.
  //
  // A SIBLING of AppEntrypoint, not a child, and that is load-bearing. Nesting
  // it would mount AppProvider — which throws at module scope when VITE_API_URL
  // is unset — plus the pre-Hawk ModalHost and ToastHost, for a page that makes
  // no API calls and brings its own overlay hosts.
  { path: '/preview/*', element: lazyRoute(<HawkPreviewScreen />) },

  {
    path: '/',
    element: <AppEntrypoint />,
    children: [
      // Public auth
      { path: ADMIN_ROUTES.LOGIN.relativePath, element: lazyRoute(<LoginScreen />) },

      {
        element: <AuthGuard />,
        children: [
          { path: ADMIN_ROUTES.TOTP_SETUP.relativePath, element: lazyRoute(<TotpSetupScreen />) },

          {
            element: <AdminShell />,
            children: [
              { index: true, element: <Navigate to={ADMIN_ROUTES.DASHBOARD.absPath} replace /> },

              {
                path: ADMIN_ROUTES.DASHBOARD.relativePath,
                element: lazyRoute(<DashboardScreen />),
              },

              // STAFF
              {
                element: <RoleGuard allow={STAFF} />,
                children: [
                  {
                    path: ADMIN_ROUTES.USERS.relativePath,
                    element: lazyRoute(<UsersListScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.USERS.DETAIL.absPath,
                    element: lazyRoute(<UserDetailScreen />),
                  },
                  { path: ADMIN_ROUTES.KYC.relativePath, element: lazyRoute(<KycListScreen />) },
                  {
                    path: ADMIN_ROUTES.KYC.DETAIL.absPath,
                    element: lazyRoute(<KycDetailScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.CALLS.relativePath,
                    element: lazyRoute(<CallsListScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.BOOKINGS.relativePath,
                    element: lazyRoute(<BookingsListScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.REPORTS.relativePath,
                    element: lazyRoute(<ReportsListScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.REVIEWS.relativePath,
                    element: lazyRoute(<ReviewsListScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.STRIKES.relativePath,
                    element: lazyRoute(<StrikesListScreen />),
                  },
                ],
              },

              // FINANCE
              {
                element: <RoleGuard allow={FINANCE} />,
                children: [
                  {
                    path: ADMIN_ROUTES.WITHDRAWALS.relativePath,
                    element: lazyRoute(<WithdrawalsListScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.REFUNDS.relativePath,
                    element: lazyRoute(<RefundsListScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.TRANSACTIONS.relativePath,
                    element: lazyRoute(<TransactionsListScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.WALLETS.relativePath,
                    element: lazyRoute(<WalletOverviewScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.WALLETS.ACCOUNTS.relativePath,
                    element: lazyRoute(<SystemAccountsScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.WALLETS.JOURNALS.relativePath,
                    element: lazyRoute(<JournalsListScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.WALLETS.RECONCILIATION.relativePath,
                    element: lazyRoute(<ReconciliationScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.WALLETS.MANUAL_JOURNAL.relativePath,
                    element: lazyRoute(<ManualJournalScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.WALLETS.USER_WALLET.relativePath,
                    element: lazyRoute(<UserWalletScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.WEBHOOKS.relativePath,
                    element: lazyRoute(<WebhooksListScreen />),
                  },
                ],
              },

              // ADMIN_ONLY
              {
                element: <RoleGuard allow={ADMIN_ONLY} />,
                children: [
                  {
                    path: ADMIN_ROUTES.CONTENT.BANNERS.relativePath,
                    element: lazyRoute(<BannersScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.CONTENT.LEGAL.relativePath,
                    element: lazyRoute(<LegalScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.CONTENT.FAQS.relativePath,
                    element: lazyRoute(<FaqsScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.CONTENT.relativePath,
                    element: <Navigate to={ADMIN_ROUTES.CONTENT.BANNERS.absPath} replace />,
                  },
                  { path: ADMIN_ROUTES.CONFIG.relativePath, element: lazyRoute(<ConfigScreen />) },
                  {
                    path: ADMIN_ROUTES.APP_RELEASES.relativePath,
                    element: lazyRoute(<AppReleasesScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.CAMPAIGNS.relativePath,
                    element: lazyRoute(<CampaignsScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.TECHNICAL.relativePath,
                    element: lazyRoute(<TechnicalScreen />),
                  },
                  {
                    path: ADMIN_ROUTES.AUDIT_LOG.relativePath,
                    element: lazyRoute(<AuditLogScreen />),
                  },
                ],
              },
            ],
          },
        ],
      },

      // Catch-all → dashboard. AuthGuard bounces unauth'd users.
      { path: '*', element: <Navigate to={ADMIN_ROUTES.DASHBOARD.absPath} replace /> },
    ],
  },
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);
