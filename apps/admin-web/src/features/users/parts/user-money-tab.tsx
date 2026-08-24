import {
  HawkAdminPanel,
  HawkBadge,
  HawkCallout,
  HawkCaption,
  HawkKeyValue,
  HawkSemantic,
  HawkStatusBadge,
  HawkTable,
  HawkText,
  IconVerified,
  formatKobo,
  type HawkColumn,
} from '@ohlify/hawk-ui';

import type {
  AdminUserDetail,
  AdminUserMinutesHeld,
  AdminUserTransaction,
  AdminUserWithdrawalRow,
} from '@ohlify/api';
import { absoluteTime, formatDuration, statusFor } from './user-status.js';

/**
 * Money — the ledger view of one account.
 *
 * Finance-gated at the screen level. Everything here is derived from the
 * double-entry tables rather than a denormalised counter, so a figure that
 * looks wrong can always be traced to the entries that produced it.
 */
export function UserMoneyTab({ user }: { user: AdminUserDetail }) {
  const money = user.money;
  const bank = user.bank_account;
  const vitals = user.vitals;
  const transactions = money?.transactions ?? [];
  const withdrawalRows = money?.withdrawals ?? [];
  const minutesHeld = money?.minutes_held ?? [];
  const rates = money?.rates ?? [];
  const transactionColumns: ReadonlyArray<HawkColumn<AdminUserTransaction>> = [
    {
      key: 'when',
      header: 'When',
      width: '18%',
      render: (row) => <span className="hawk-record">{absoluteTime(row.created_at)}</span>,
    },
    {
      key: 'kind',
      header: 'Kind',
      width: '20%',
      render: (row) => (
        <span className="hawk-record">{row.kind.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'memo',
      header: 'Reference',
      render: (row) => <span className="hawk-record">{row.memo ?? '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: '16%',
      render: (row) => (
        // Sign carried by the figure, not by a separate column: a ledger where
        // direction lives elsewhere is a ledger you have to read twice.
        <span
          className={
            row.direction === 'credit'
              ? 'hawk-record font-semibold text-hawk-success'
              : 'hawk-record font-semibold text-hawk-critical'
          }
        >
          {row.direction === 'credit' ? '+' : '−'}
          {formatKobo(row.amount_kobo)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance after',
      align: 'right',
      width: '16%',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">
          {formatKobo(row.balance_after_kobo)}
        </span>
      ),
    },
  ];

  const withdrawalColumns: ReadonlyArray<HawkColumn<AdminUserWithdrawalRow>> = [
    {
      key: 'id',
      header: 'Withdrawal',
      width: '18%',
      render: (row) => <span className="hawk-record">{row.id}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: '16%',
      render: (row) => <span className="hawk-record">{formatKobo(row.amount_kobo)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '14%',
      render: (row) => <HawkStatusBadge status={statusFor('withdrawal', row.status)} size="sm" />,
    },
    {
      key: 'reason',
      header: 'Failure reason',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{row.failure_reason ?? '—'}</span>
      ),
    },
    {
      key: 'requested',
      header: 'Requested',
      align: 'right',
      width: '18%',
      render: (row) => <span className="hawk-record">{absoluteTime(row.requested_at)}</span>,
    },
  ];

  const minutesColumns: ReadonlyArray<HawkColumn<AdminUserMinutesHeld>> = [
    { key: 'who', header: 'Client', render: (row) => row.counterparty_name ?? '—' },
    {
      key: 'type',
      header: 'Type',
      width: '14%',
      render: (row) => <HawkBadge label={row.call_type} semantic={HawkSemantic.NEUTRAL} size="sm" />,
    },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      width: '18%',
      render: (row) => (
        <span className="hawk-record">{formatDuration(row.seconds_remaining)}</span>
      ),
    },
    {
      key: 'escrow',
      header: 'In escrow',
      align: 'right',
      width: '18%',
      render: (row) => <span className="hawk-record">{formatKobo(row.escrow_kobo)}</span>,
    },
  ];

  const escrowTotal = minutesHeld.reduce((sum, row) => sum + Number(row.escrow_kobo), 0);

  return (
    <div className="flex flex-col gap-hawk-6">
      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Balances" className="lg:col-span-2">
          <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
            <HawkKeyValue
              label="Wallet balance"
              value={formatKobo(vitals.wallet_kobo ?? 0)}
              record
            />
            <HawkKeyValue
              label="Held in escrow"
              value={formatKobo(vitals.escrow_kobo ?? 0)}
              record
            />
            <HawkKeyValue
              label="Lifetime earned"
              value={formatKobo(vitals.lifetime_earned_kobo ?? 0)}
              record
            />
            <HawkKeyValue
              label="Lifetime spent"
              value={formatKobo(vitals.lifetime_spent_kobo ?? 0)}
              record
            />
          </div>
        </HawkAdminPanel>

        <HawkAdminPanel title="Payout account">
          <div className="flex flex-col gap-hawk-4">
            <HawkKeyValue label="Bank" value={bank?.bank_name ?? '—'} record />
            <HawkKeyValue
              label="Account"
              value={bank ? `••••${bank.account_number_last4}` : '—'}
              record
            />
            <HawkKeyValue
              label="Account name"
              value={
                <span className="flex items-center gap-hawk-2">
                  <span className="hawk-record">{bank?.account_name ?? '—'}</span>
                  {Boolean(bank) && (
                    <IconVerified size={12} className="shrink-0 text-hawk-success" />
                  )}
                </span>
              }
            />
            <HawkKeyValue label="Added" value={absoluteTime(bank?.added_at ?? null)} record />

            {/*
              The name-match verdict is the single guard that stops a payout
              reaching the wrong person, so it is stated rather than implied by
              a tick nobody notices.
            */}
            {!Boolean(bank) && (
              <HawkCallout
                semantic={HawkSemantic.CRITICAL}
                title="Bank name does not match"
                message="The name on the bank account differs from the platform name. Verify before approving any withdrawal."
              />
            )}
          </div>
        </HawkAdminPanel>
      </div>

      <HawkAdminPanel title="Wallet entries" flush>
        <HawkTable
          bare
          columns={transactionColumns}
          rows={transactions}
          rowKey={(row) => row.id}
          emptyTitle="No entries"
          emptyDescription="Nothing has moved through this wallet."
        />
      </HawkAdminPanel>

      <HawkAdminPanel title="Withdrawals" flush>
        <HawkTable
          bare
          columns={withdrawalColumns}
          rows={withdrawalRows}
          rowKey={(row) => row.id}
          emptyTitle="No withdrawals"
          emptyDescription="This user has never requested a payout."
        />
      </HawkAdminPanel>

      <HawkAdminPanel
        title="Minutes clients hold"
        flush
        actions={
          <HawkCaption ink="muted" className="hawk-record">
            {formatKobo(escrowTotal)} in escrow
          </HawkCaption>
        }
      >
        <HawkTable
          columns={minutesColumns}
          rows={minutesHeld}
          rowKey={(row) => `${row.counterparty_name ?? 'unknown'}-${row.call_type}`}
          emptyTitle="No minutes held"
          emptyDescription="No client is carrying a balance with this professional."
        />
      </HawkAdminPanel>

      <HawkAdminPanel title="Rates">
        <div className="flex flex-col gap-hawk-4">
          {rates.length === 0 ? (
            <HawkCallout
              semantic={HawkSemantic.CAUTION}
              title="No rates configured"
              message="A professional with no rate never appears in search — they are invisible supply."
            />
          ) : (
            rates.map((rate) => (
              <div
                key={rate.id}
                className="flex items-center justify-between gap-hawk-4 rounded-hawk-sm border border-hawk-line px-hawk-5 py-hawk-4"
              >
                <span className="flex items-center gap-hawk-3">
                  <HawkBadge label={rate.call_type} semantic={HawkSemantic.NEUTRAL} size="sm" />
                  <HawkText variant="label">{rate.duration_minutes} minutes</HawkText>
                </span>
                <HawkText variant="label" record ink="strong" className="font-semibold">
                  {formatKobo(rate.price_kobo)}
                </HawkText>
              </div>
            ))
          )}
        </div>
      </HawkAdminPanel>
    </div>
  );
}
