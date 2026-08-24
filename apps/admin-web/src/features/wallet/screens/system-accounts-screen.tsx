import { useState } from 'react';

import type { AdminAccountView } from '@ohlify/api';
import {
  HawkAdminPageHeader,
  HawkAdminPanel,
  HawkBadge,
  HawkCallout,
  HawkDataState,
  HawkDetailDrawer,
  HawkDropdown,
  HawkFigure,
  HawkKeyValue,
  HawkKpiStrip,
  HawkSemantic,
  HawkTable,
  IconLedger,
  IconWallet,
  formatKobo,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useSystemAccount, useSystemAccounts } from '../api/use-wallet.js';

const KIND_OPTIONS = [
  { value: 'all', label: 'All kinds' },
  { value: 'system', label: 'System' },
  { value: 'user', label: 'User' },
  { value: 'liability', label: 'Liability' },
];

/**
 * Every ledger account and its live balance.
 *
 * Not a `BoardScreen`: this endpoint returns the whole set rather than a
 * cursor page, and wrapping it in pagination controls that do nothing would be
 * a lie about the data.
 */
export function SystemAccountsScreen() {
  const [kind, setKind] = useState('all');
  const [openCode, setOpenCode] = useState<string | null>(null);
  const list = useSystemAccounts(kind);

  const accounts = list.data ?? [];
  const total = accounts.reduce((sum, row) => sum + Number(row.balance_kobo ?? 0), 0);

  const kpis: HawkKpi[] = [
    {
      key: 'accounts',
      label: 'Accounts',
      value: accounts.length.toLocaleString(),
      icon: IconLedger,
    },
    {
      key: 'total',
      label: 'Summed balance',
      valueKobo: total,
      icon: IconWallet,
      // Across ALL accounts this sums to zero by double-entry. Filtered to one
      // kind it will not, and that is expected rather than an error.
      semantic: kind === 'all' && total !== 0 ? 'critical' : 'neutral',
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminAccountView>> = [
    {
      key: 'code',
      header: 'Code',
      width: '24%',
      render: (row) => (
        <span className="hawk-record">{row.system_code ?? shortId(row.id, 14)}</span>
      ),
    },
    { key: 'label', header: 'Label', width: '30%', render: (row) => row.label ?? '—' },
    {
      key: 'kind',
      header: 'Kind',
      width: '14%',
      render: (row) => (
        <HawkBadge label={humanizeStatus(row.kind)} semantic={HawkSemantic.NEUTRAL} size="sm" />
      ),
    },
    {
      key: 'currency',
      header: 'Currency',
      width: '10%',
      render: (row) => <span className="hawk-record">{row.currency ?? 'NGN'}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (row) => (
        <span className="hawk-record font-semibold">{formatKobo(row.balance_kobo)}</span>
      ),
    },
  ];

  return (
    <>
      <HawkAdminPageHeader
        title="System accounts"
        subtitle="Live ledger balances for every account."
      />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        <HawkKpiStrip items={kpis} />

        <HawkAdminPanel
          title="Accounts"
          flush
          actions={
            <div className="w-44">
              <HawkDropdown options={KIND_OPTIONS} value={kind} onChange={setKind} />
            </div>
          }
        >
          <HawkTable
            bare
            columns={columns}
            rows={accounts}
            rowKey={(row) => row.id}
            dataState={list.isLoading ? HawkDataState.LOADING : HawkDataState.FRESH}
            {...(list.error
              ? { error: list.error.errorMessage ?? 'Could not load accounts' }
              : {})}
            onRetry={() => void list.refetch()}
            onRowClick={(row) => setOpenCode(row.system_code ?? row.id)}
            emptyTitle="No accounts"
            emptyDescription="Nothing matches this kind filter."
          />
        </HawkAdminPanel>
      </div>

      <SystemAccountDrawer code={openCode} onClose={() => setOpenCode(null)} />
    </>
  );
}

function SystemAccountDrawer({
  code,
  onClose,
}: {
  code: string | null;
  onClose: () => void;
}) {
  const detail = useSystemAccount(code);
  const data = detail.data;

  return (
    <HawkDetailDrawer.Root
      open={Boolean(code)}
      onClose={onClose}
      title={data?.label ?? 'Account'}
      subtitle={data?.system_code ?? (code ? shortId(code, 20) : undefined)}
    >
      {detail.isLoading && <RowsSkeleton rows={6} />}

      {!detail.isLoading && detail.error && (
        <HawkCallout
          semantic={HawkSemantic.CRITICAL}
          title="Could not load"
          message={detail.error.errorMessage ?? 'The request failed.'}
        />
      )}

      {data && (
        <div className="flex flex-col gap-hawk-6">
          {/* The balance leads — it is the reason to open an account row. */}
          <HawkFigure value={data.balance_kobo ?? 0} size="lg" />

          <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
            <HawkKeyValue label="Account" value={shortId(data.id, 20)} record />
            <HawkKeyValue label="System code" value={data.system_code ?? '—'} record />
            <HawkKeyValue label="Label" value={data.label ?? '—'} />
            <HawkKeyValue
              label="Kind"
              value={
                <HawkBadge
                  label={humanizeStatus(data.kind)}
                  semantic={HawkSemantic.NEUTRAL}
                  size="sm"
                />
              }
            />
            <HawkKeyValue label="Currency" value={data.currency ?? 'NGN'} record />
            <HawkKeyValue
              label="Active"
              value={
                <HawkBadge
                  label={data.is_active ? 'Active' : 'Inactive'}
                  semantic={data.is_active ? HawkSemantic.SUCCESS : HawkSemantic.NEUTRAL}
                  size="sm"
                />
              }
            />
          </div>
        </div>
      )}
    </HawkDetailDrawer.Root>
  );
}
