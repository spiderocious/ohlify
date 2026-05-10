import { useState } from 'react';

import { AppDropdownInput, AppText } from '@ohlify/ui';
import { AdminAccountKind, type AdminAccountView } from '@ohlify/api';

import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { StatusPill } from '../../../shared/parts/status-pill.js';
import { formatKobo } from '../../../shared/format/kobo.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useSystemAccount, useSystemAccounts } from '../api/use-wallet.js';

const KIND_OPTIONS = [
  { label: 'All', value: 'all' },
  ...Object.values(AdminAccountKind).map((v) => ({ label: humanizeStatus(v), value: v })),
];

export function SystemAccountsScreen() {
  const [kind, setKind] = useState<string>('all');
  const list = useSystemAccounts(kind);
  const [openCode, setOpenCode] = useState<string | null>(null);

  const columns: ColumnDef<AdminAccountView>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '24%',
      render: (a) => (
        <code className="text-text-primary text-xs">
          {a.system_code ?? shortId(a.id, 14)}
        </code>
      ),
    },
    { key: 'label', header: 'Label', width: '28%', render: (a) => a.label ?? '—' },
    {
      key: 'kind',
      header: 'Kind',
      width: '14%',
      render: (a) => <StatusPill label={humanizeStatus(a.kind)} tone="muted" />,
    },
    { key: 'currency', header: 'Currency', width: '10%', render: (a) => a.currency ?? '—' },
    {
      key: 'balance',
      header: 'Balance',
      width: '24%',
      align: 'right',
      render: (a) => (
        <AppText variant="bodyTitle" className="text-text-primary tabular-nums">
          {formatKobo(a.balance_kobo)}
        </AppText>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="System accounts" subtitle="Live ledger balances for every account." />

      <FilterBar>
        <div className="w-44">
          <AppDropdownInput label="Kind" options={KIND_OPTIONS} value={kind} onChange={setKind} />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.data}
        rowKey={(a) => a.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No accounts"
        onRowClick={(a) => setOpenCode(a.system_code ?? a.id)}
      />
      <SystemAccountDrawer code={openCode} onClose={() => setOpenCode(null)} />
    </>
  );
}

function SystemAccountDrawer({ code, onClose }: { code: string | null; onClose: () => void }) {
  const detail = useSystemAccount(code);
  return (
    <DetailDrawer
      open={Boolean(code)}
      onClose={onClose}
      title={code ? `Account ${code}` : 'Account'}
      width={480}
    >
      <QueryView isLoading={detail.isLoading} error={detail.error}>
        {detail.data && (
          <DetailSection title="Account">
            <DetailRow label="ID">{shortId(detail.data.id, 18)}</DetailRow>
            <DetailRow label="System code">{detail.data.system_code ?? '—'}</DetailRow>
            <DetailRow label="Label">{detail.data.label ?? '—'}</DetailRow>
            <DetailRow label="Kind">{humanizeStatus(detail.data.kind)}</DetailRow>
            <DetailRow label="Owner user">{shortId(detail.data.owner_user_id, 18)}</DetailRow>
            <DetailRow label="Currency">{detail.data.currency}</DetailRow>
            <DetailRow label="Active">{detail.data.is_active ? 'Yes' : 'No'}</DetailRow>
            <DetailRow label="Balance">
              <AppText variant="header">{formatKobo(detail.data.balance_kobo)}</AppText>
            </DetailRow>
          </DetailSection>
        )}
      </QueryView>
    </DetailDrawer>
  );
}
