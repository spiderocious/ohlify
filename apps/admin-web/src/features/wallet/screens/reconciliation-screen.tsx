import { useState } from 'react';

import {
  HawkAdminPageHeader,
  HawkAdminPanel,
  HawkBalanceCheck,
  HawkButton,
  HawkCallout,
  HawkCaption,
  HawkEmptyState,
  HawkSemantic,
  HawkTable,
  HawkText,
  IconRefresh,
  formatKobo,
  type HawkColumn,
} from '@ohlify/hawk-ui';

import { RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { shortId } from '../../../shared/lib/labels.js';
import { useReconciliation } from '../api/use-wallet.js';

/**
 * One drifted account, as the endpoint returns it.
 *
 * The response shape is not pinned in `@ohlify/api` because the backend may
 * still tweak it, so this is read defensively: every field is optional and
 * anything unrecognised falls through to a dash rather than crashing the
 * screen. The previous version dumped raw JSON for the same reason — this
 * keeps the tolerance and loses the wall of braces.
 */
interface DriftRow {
  account_id?: string;
  account_label?: string;
  cached_balance_kobo?: string | number;
  ledger_sum_kobo?: string | number;
  drift_kobo?: string | number;
}

const num = (value: string | number | undefined): number => {
  if (value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Reconciliation — the ledger's own alarm.
 *
 * Double-entry makes cached balances and ledger sums equal by construction: an
 * AFTER INSERT trigger advances the cache under a per-account advisory lock,
 * and both tables are append-only. So a row coming back here does not mean
 * "the numbers disagree a little" — it means that path was bypassed, which is
 * a bug rather than a discrepancy. The screen says so.
 */
export function ReconciliationScreen() {
  const [run, setRun] = useState(false);
  const recon = useReconciliation(run);

  const rows: DriftRow[] = Array.isArray(recon.data)
    ? (recon.data as DriftRow[])
    : Array.isArray((recon.data as { drift?: DriftRow[] } | undefined)?.drift)
      ? ((recon.data as { drift: DriftRow[] }).drift)
      : [];

  const totalDrift = rows.reduce((sum, row) => sum + num(row.drift_kobo), 0);

  const columns: ReadonlyArray<HawkColumn<DriftRow>> = [
    {
      key: 'account',
      header: 'Account',
      width: '34%',
      render: (row) => (
        <div className="flex flex-col">
          <HawkText variant="label" ink="strong" className="font-medium">
            {row.account_label ?? '—'}
          </HawkText>
          <HawkCaption ink="muted" className="hawk-record">
            {shortId(row.account_id, 18)}
          </HawkCaption>
        </div>
      ),
    },
    {
      key: 'cached',
      header: 'Cached balance',
      align: 'right',
      render: (row) => (
        <span className="hawk-record">{formatKobo(num(row.cached_balance_kobo))}</span>
      ),
    },
    {
      key: 'ledger',
      header: 'Ledger sum',
      align: 'right',
      render: (row) => (
        <span className="hawk-record">{formatKobo(num(row.ledger_sum_kobo))}</span>
      ),
    },
    {
      key: 'drift',
      header: 'Drift',
      align: 'right',
      render: (row) => (
        <span className="hawk-record font-semibold text-hawk-critical">
          {formatKobo(num(row.drift_kobo))}
        </span>
      ),
    },
  ];

  return (
    <>
      <HawkAdminPageHeader
        title="Reconciliation"
        subtitle="Compares every cached account balance against the live ledger sum."
        actions={
          <HawkButton
            label={run ? 'Re-run' : 'Run reconciliation'}
            startIcon={IconRefresh}
            loading={recon.isFetching}
            onClick={() => {
              if (run) void recon.refetch();
              else setRun(true);
            }}
          />
        }
      />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        {!run && (
          <HawkEmptyState
            title="Not run yet"
            description="Reconciliation walks every account and every ledger entry. It takes a few seconds and is safe to run at any time — it only reads."
            action={
              <HawkButton label="Run reconciliation" onClick={() => setRun(true)} />
            }
          />
        )}

        {run && recon.isLoading && <RowsSkeleton rows={5} />}

        {run && recon.error && (
          <HawkCallout
            semantic={HawkSemantic.CRITICAL}
            title="Reconciliation failed to run"
            message={recon.error.errorMessage ?? 'The request failed.'}
          />
        )}

        {run && !recon.isLoading && !recon.error && (
          <>
            <HawkBalanceCheck difference={totalDrift} balanced={rows.length === 0} />

            {rows.length === 0 ? (
              <HawkCaption ink="muted" className="leading-snug">
                Every account&rsquo;s cached balance matches the sum of its ledger entries. This
                is the expected result — the trigger and the append-only constraints make drift
                impossible at the data layer, so this run is defence in depth rather than a
                routine check.
              </HawkCaption>
            ) : (
              <>
                <HawkCallout
                  semantic={HawkSemantic.CRITICAL}
                  hazard
                  title={`${rows.length} account${rows.length === 1 ? '' : 's'} drifted`}
                  message="The cached balance disagrees with the ledger. That should be impossible — investigate for a manual SQL write, a disabled trigger, or replication lag before trusting any figure derived from these accounts."
                />
                <HawkAdminPanel title="Drifted accounts" flush>
                  <HawkTable
                    bare
                    columns={columns}
                    rows={rows}
                    rowKey={(row) => row.account_id ?? String(Math.random())}
                    emptyTitle="No drift"
                  />
                </HawkAdminPanel>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
