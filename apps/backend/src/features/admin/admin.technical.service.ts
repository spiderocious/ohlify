import { connectionStats } from '@lib/realtime/index.js';
import { ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import { resolveWindows, type DashboardRange } from './admin.dashboard.service.js';
import * as dashboardRepo from './admin.dashboard.repo.js';
import * as repo from './admin.technical.repo.js';

/**
 * The technical dashboard, as one composed read.
 *
 * Most of this ignores the requested range entirely — queue depth, pool
 * saturation and ledger drift are facts about *now*, and averaging them over
 * ninety days would hide every spike that mattered. The handful of genuinely
 * windowed figures (webhooks by type, auth outcomes, call streams) take the
 * range; everything else is a live probe.
 */

const toNumber = (raw: string | null | undefined): number => {
  if (raw === null || raw === undefined) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPoints = (rows: dashboardRepo.LabelledCount[]) =>
  rows.map((row) => ({ label: row.label, value: toNumber(row.value) }));

const ageOf = (seconds: string | null): number | null =>
  seconds === null ? null : toNumber(seconds);

export const technical = async (range: DashboardRange) => {
  const { current } = resolveWindows(range);

  const [
    dependencies,
    redisStats,
    processStats,
    outbox,
    retries,
    failuresByType,
    deadLetters,
    webhookHealth,
    webhooksByType,
    deviceTokens,
    idempotency,
    idempotencyRoutes,
    authOutcomes,
    authReasons,
    recentAuth,
    integrity,
    drift,
    configSummary,
    configChanges,
    versionGates,
    callStreams,
    clientEvents,
  ] = await Promise.all([
    repo.probeDependencies(),
    repo.redisSnapshot(),
    repo.processSnapshot(),
    repo.outboxSnapshot(),
    repo.outboxRetryHistogram(),
    repo.outboxFailuresByType(),
    repo.outboxDeadLetters(),
    repo.webhookHealth(),
    repo.webhooksByType(current),
    repo.deviceTokenSpread(),
    repo.idempotencyStats(current),
    repo.idempotencyByRoute(current),
    repo.authOutcomes(current),
    repo.authFailureReasons(current),
    repo.recentAuthEvents(),
    repo.integrityChecks(),
    dashboardRepo.ledgerDrift(),
    repo.configSummary(),
    repo.recentConfigChanges(),
    repo.versionGateStats(),
    repo.callStreams(current),
    repo.clientEventMix(current),
  ]);

  // Synchronous, so these sit outside the Promise.all rather than being
  // wrapped in a pointless resolved promise.
  const pool = repo.poolSnapshot();
  const realtime = connectionStats();

  return new ServiceSuccess(
    {
      range,
      window: { from: current.from.toISOString(), to: current.to.toISOString() },

      health: {
        dependencies,
        pool,
        redis: redisStats,
        process: processStats,
      },

      outbox: {
        backlog: toNumber(outbox.backlog),
        oldest_lag_seconds: ageOf(outbox.oldest_lag_seconds),
        dead_lettered: toNumber(outbox.dead_lettered),
        published_last_hour: toNumber(outbox.published_last_hour),
        retries: toPoints(retries),
        failures_by_type: toPoints(failuresByType),
        dead_letters: deadLetters.map((row) => ({
          id: row.id,
          event_type: row.event_type,
          aggregate_type: row.aggregate_type,
          aggregate_id: row.aggregate_id,
          attempts: row.attempt_count,
          error: row.last_error,
          age_seconds: toNumber(row.age_seconds),
        })),
      },

      integrations: {
        webhooks: {
          unprocessed: toNumber(webhookHealth.unprocessed),
          oldest_unprocessed_seconds: ageOf(webhookHealth.oldest_unprocessed_seconds),
          errored: toNumber(webhookHealth.errored),
          replayed: toNumber(webhookHealth.replayed),
          by_type: webhooksByType.map((row) => ({
            event_type: row.event_type,
            received: toNumber(row.received),
            processed: toNumber(row.processed),
            errored: toNumber(row.errored),
          })),
        },
        push: {
          registered_tokens: toNumber(deviceTokens.total),
          ios: toNumber(deviceTokens.ios),
          android: toNumber(deviceTokens.android),
          web: toNumber(deviceTokens.web),
        },
        // Whether Agora deliveries are actually verified. With the secret
        // unset the verifier accepts everything, and nothing else on the
        // platform would reveal that.
        agora: {
          signature_verification_enabled: Boolean(process.env['AGORA_WEBHOOK_SECRET']),
        },
      },

      api: {
        idempotency: {
          keys_stored: toNumber(idempotency.keys_stored),
          replays: toNumber(idempotency.replays),
          by_route: toPoints(idempotencyRoutes),
        },
        auth: {
          logins: toNumber(authOutcomes.logins),
          login_failures: toNumber(authOutcomes.login_failures),
          registrations: toNumber(authOutcomes.registrations),
          registration_failures: toNumber(authOutcomes.registration_failures),
          password_resets: toNumber(authOutcomes.password_resets),
          suspicious_ips: toNumber(authOutcomes.suspicious_ips),
          failure_reasons: toPoints(authReasons),
          recent: recentAuth.map((row) => ({
            id: row.id,
            event: row.event,
            outcome: row.outcome,
            reason: row.reason,
            subject: row.subject,
            ip: row.ip,
            platform: row.platform,
            app_version: row.app_version,
            created_at: row.created_at.toISOString(),
          })),
        },
      },

      realtime: {
        // Per PROCESS, not per platform: the SSE registry is an in-memory map
        // and Redis only decides which process hears an event. The client
        // labels it as such.
        connections: realtime.sockets,
        distinct_users: realtime.users,
      },

      integrity: {
        ledger_balanced: drift.length === 0,
        drift_accounts: drift.map((row) => ({
          account_id: row.account_id,
          label: row.account_label,
          cached_kobo: toNumber(row.cached_balance_kobo),
          ledger_kobo: toNumber(row.ledger_sum_kobo),
          drift_kobo: toNumber(row.drift_kobo),
        })),
        unsettled_calls: toNumber(integrity.unsettled_calls),
        expired_intents: toNumber(integrity.expired_intents),
        orphan_device_tokens: toNumber(integrity.orphan_device_tokens),
      },

      config: {
        total_keys: toNumber(configSummary.total_keys),
        public_keys: toNumber(configSummary.public_keys),
        changed_this_week: toNumber(configSummary.changed_this_week),
        recent_changes: configChanges.map((row) => ({
          key: row.key,
          value: JSON.stringify(row.value),
          is_public: row.is_public,
          updated_at: row.updated_at.toISOString(),
          updated_by: row.updated_by_email,
        })),
        version_gates: versionGates.map((row) => ({
          platform: row.platform,
          min_version: row.min_version,
          forced: row.forced,
          sessions_below: toNumber(row.sessions_below),
        })),
      },

      call_streams: {
        server_events: toNumber(callStreams.server_events),
        client_events: toNumber(callStreams.client_events),
        missing_client_end: toNumber(callStreams.missing_client_end),
        orphan_client_streams: toNumber(callStreams.orphan_client_streams),
        client_event_mix: toPoints(clientEvents),
      },

      generated_at: new Date().toISOString(),
    },
    MESSAGE_KEYS.ADMIN_METRICS_OVERVIEW_FETCHED,
  );
};
