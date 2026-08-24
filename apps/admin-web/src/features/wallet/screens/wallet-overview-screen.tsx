import { useMemo } from 'react';

import {
  HawkAdminPageHeader,
  HawkAdminPanel,
  HawkCaption,
  HawkFigure,
  HawkKpiStrip,
  HawkText,
  IconBank,
  IconLedger,
  IconWallet,
  formatKobo,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { humanizeStatus } from '../../../shared/lib/labels.js';
import {
  usePaystackFeesSummary,
  usePlatformRevenueSummary,
  useSystemAccounts,
} from '../api/use-wallet.js';

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Wallet overview (A11) — the shape of the platform's money.
 *
 * System accounts are shown by balance descending rather than by code, because
 * the question this screen answers is "where is the money sitting?" and an
 * alphabetical list buries the answer under whatever starts with A.
 */
export function WalletOverviewScreen() {
  const accounts = useSystemAccounts('system');

  const window = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: ymd(from), to: ymd(to) };
  }, []);

  const fees = usePaystackFeesSummary(window);
  const revenue = usePlatformRevenueSummary(window);

  const loading = accounts.isLoading || fees.isLoading || revenue.isLoading;

  const ranked = [...(accounts.data ?? [])].sort(
    (a, b) => Number(b.balance_kobo ?? 0) - Number(a.balance_kobo ?? 0),
  );

  const kpis: HawkKpi[] = [
    {
      key: 'revenue',
      label: 'Platform revenue',
      valueKobo: revenue.data?.total_kobo ?? 0,
      icon: IconWallet,
      basis: 'net',
      semantic: 'success',
    },
    {
      key: 'fees',
      label: 'Processor fees',
      valueKobo: fees.data?.total_kobo ?? 0,
      icon: IconBank,
      // Fees are a cost, so they read as caution even though the number is
      // simply a fact — a growing one is bad news.
      semantic: 'caution',
    },
    {
      key: 'accounts',
      label: 'System accounts',
      value: (accounts.data?.length ?? 0).toLocaleString(),
      icon: IconLedger,
    },
  ];

  return (
    <>
      <HawkAdminPageHeader
        title="Wallet overview"
        subtitle="System accounts and the last 30 days of fees and revenue · UTC"
      />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        {loading ? <RowsSkeleton rows={3} /> : <HawkKpiStrip items={kpis} />}

        <HawkAdminPanel
          title="Accounts by balance"
          actions={<HawkCaption ink="muted">largest first</HawkCaption>}
        >
          {accounts.isLoading ? (
            <RowsSkeleton rows={6} />
          ) : (
            <div className="grid gap-hawk-4 md:grid-cols-2 xl:grid-cols-3">
              {ranked.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-col gap-hawk-2 rounded-hawk-sm border border-hawk-line p-hawk-5"
                >
                  <HawkText variant="label" ink="strong" clamp={1} className="font-medium">
                    {account.label ?? account.system_code ?? humanizeStatus(account.kind)}
                  </HawkText>
                  <HawkCaption ink="disabled" className="hawk-record">
                    {account.system_code ?? `${account.kind} · ${account.id.slice(0, 10)}`}
                  </HawkCaption>
                  {/*
                    HawkFigure rather than raw text: it respects the amount
                    masking toggle and renders in the record face, so a column
                    of balances lines up on the decimal.
                  */}
                  <HawkFigure value={account.balance_kobo ?? 0} size="sm" />
                </div>
              ))}
            </div>
          )}
        </HawkAdminPanel>

        <HawkCaption ink="disabled">
          Balances are the cached `account_balances` values, kept in step with the ledger by an
          AFTER INSERT trigger under a per-account advisory lock. Run reconciliation to prove
          they still agree — {formatKobo(0)} of drift is the only acceptable answer.
        </HawkCaption>
      </div>
    </>
  );
}
