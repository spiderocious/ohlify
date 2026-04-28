import * as adminRepo from '@features/admin/admin.repo.js';
import { logger } from '@lib/logger.js';

// Periodic ledger drift check. Runs the same SQL the on-demand admin endpoint
// uses (sum of wallet_entries vs cached account_balances per account). When
// drift is found, logs ERROR with the per-account breakdown so ops gets paged.
// Otherwise logs INFO at debug volume.
//
// Intended cadence is once per hour. The trigger system makes drift effectively
// impossible at the data layer (AFTER INSERT trigger updates the cached
// balance under per-account advisory lock, append-only enforced), so this
// worker is a defense-in-depth heartbeat — if it ever fires, something is
// seriously wrong (manual SQL bypass, trigger disabled, replication lag).

const ONE_HOUR_MS = 60 * 60 * 1000;

interface ReconciliationWorkerHandle {
  stop: () => Promise<void>;
}

const tick = async (): Promise<void> => {
  try {
    const drift = await adminRepo.reconcile();
    if (drift.length === 0) {
      logger.info({ accounts: 0 }, 'wallet reconciliation OK');
      return;
    }
    logger.error(
      {
        driftAccounts: drift.length,
        accounts: drift.map((d) => ({
          account_id: d.account_id,
          account_label: d.account_label,
          cached_balance_kobo: d.cached_balance_kobo,
          ledger_sum_kobo: d.ledger_sum_kobo,
          drift_kobo: d.drift_kobo,
        })),
      },
      'WALLET RECONCILIATION DRIFT — investigate immediately',
    );
  } catch (err) {
    logger.error({ err }, 'reconciliation tick failed');
  }
};

export const startReconciliationWorker = (
  intervalMs: number = ONE_HOUR_MS,
): ReconciliationWorkerHandle => {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;

  const loop = async (): Promise<void> => {
    if (stopped) return;
    await tick();
    if (!stopped) {
      timer = setTimeout(() => {
        void loop();
      }, intervalMs);
      timer.unref();
    }
  };

  // Defer the first run so server boot isn't slowed down. We start ticking
  // 30s after boot so warmup queries don't compete with the reconciliation
  // SQL for connections.
  timer = setTimeout(() => {
    void loop();
  }, 30_000);
  timer.unref();

  logger.info({ intervalMs }, 'reconciliation worker started');

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      return Promise.resolve();
    },
  };
};
