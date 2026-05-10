import { useState } from 'react';

import { AppButton, AppText } from '@ohlify/ui';

import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { useReconciliation } from '../api/use-wallet.js';

/**
 * Reconciliation result shape isn't pinned in `@ohlify/api` — backend may
 * tweak it as the implementation evolves. We render the JSON verbatim so
 * any field the server returns shows up; the operator inspects manually.
 */
export function ReconciliationScreen() {
  const [run, setRun] = useState(false);
  const recon = useReconciliation(run);

  return (
    <>
      <PageHeader
        title="Reconciliation"
        subtitle="Compares cached account balances against the live ledger sum."
        actions={
          <AppButton
            label={run ? 'Re-run' : 'Run reconciliation'}
            variant="solid"
            height={36}
            isLoading={recon.isFetching}
            onPressed={() => {
              if (run) recon.refetch();
              else setRun(true);
            }}
          />
        }
      />

      {!run && (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-text-muted">
          <AppText variant="bodyTitle">Click "Run reconciliation" to start</AppText>
          <AppText variant="bodySmall">This may take a few seconds.</AppText>
        </div>
      )}

      {run && (
        <div className="px-6 py-6">
          <QueryView isLoading={recon.isLoading} error={recon.error}>
            <pre className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-surface p-4 text-xs text-text-primary">
              {JSON.stringify(recon.data, null, 2)}
            </pre>
          </QueryView>
        </div>
      )}
    </>
  );
}
