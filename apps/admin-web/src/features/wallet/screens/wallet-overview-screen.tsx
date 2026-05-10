import { useMemo } from 'react';

import { AppText } from '@ohlify/ui';
import { IconCreditCard, IconWallet } from '@icons';

import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { formatKobo } from '../../../shared/format/kobo.js';
import { humanizeStatus } from '../../../shared/lib/labels.js';
import { KpiCard } from '../../dashboard/parts/kpi-card.js';
import {
  usePaystackFeesSummary,
  usePlatformRevenueSummary,
  useSystemAccounts,
} from '../api/use-wallet.js';

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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

  return (
    <>
      <PageHeader
        title="Wallet overview"
        subtitle="Top system accounts + 30-day fee/revenue summaries."
      />
      <div className="grid gap-4 px-6 py-6 lg:grid-cols-3">
        <QueryView isLoading={revenue.isLoading} error={revenue.error}>
          {revenue.data && (
            <KpiCard
              label="Platform revenue (30d)"
              value={formatKobo(revenue.data.total_kobo)}
              hint={`${revenue.data.currency ?? 'NGN'} · sum of platform_revenue`}
              Icon={IconCreditCard}
              tone="success"
            />
          )}
        </QueryView>

        <QueryView isLoading={fees.isLoading} error={fees.error}>
          {fees.data && (
            <KpiCard
              label="Paystack fees (30d)"
              value={formatKobo(fees.data.total_kobo)}
              hint={`${fees.data.currency ?? 'NGN'} · sum of paystack_fees`}
              Icon={IconCreditCard}
              tone="warning"
            />
          )}
        </QueryView>

        <KpiCard
          label="System accounts"
          value={(accounts.data?.length ?? 0).toString()}
          hint="Live ledger accounts"
          Icon={IconWallet}
        />
      </div>

      <div className="px-6 pb-6">
        <AppText variant="bodyTitle" className="mb-3">
          Top accounts by balance
        </AppText>
        <QueryView isLoading={accounts.isLoading} error={accounts.error}>
          {accounts.data && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[...accounts.data]
                .sort((a, b) => Number(b.balance_kobo ?? 0) - Number(a.balance_kobo ?? 0))
                .slice(0, 9)
                .map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-1 rounded-md border border-border bg-surface px-4 py-3"
                  >
                    <AppText variant="body" className="font-semibold text-text-primary">
                      {a.label ?? a.system_code ?? humanizeStatus(a.kind)}
                    </AppText>
                    <code className="text-[10px] text-text-muted">
                      {a.system_code ?? `${a.kind} · ${a.id.slice(0, 10)}`}
                    </code>
                    <AppText variant="bodyTitle" className="mt-1 tabular-nums">
                      {formatKobo(a.balance_kobo)}
                    </AppText>
                  </div>
                ))}
            </div>
          )}
        </QueryView>
      </div>
    </>
  );
}
