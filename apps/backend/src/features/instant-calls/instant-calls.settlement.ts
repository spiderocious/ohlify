import type { PoolClient } from 'pg';

import * as eventsRepo from '@features/call-session-events/call-session-events.repo.js';
import { recordCallEvent } from '@features/chat/chat.service.js';
import { CallEventOutcome } from '@features/chat/chat.types.js';
import { deriveBillableSeconds, DurationSource } from '@features/call-session-events/duration.js';
import * as minutesRepo from '@features/minutes/minutes.repo.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { logger } from '@lib/logger.js';
import { nowUtc } from '@lib/time.js';
import { settleMinutes } from '@lib/wallet/flows/minutes-settle.js';

import * as repo from './instant-calls.repo.js';
import { InstantCallStatus, type InstantCallRow } from './instant-calls.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface SettlementOutcome {
  billedSeconds: number;
  amountKobo: bigint;
  source: DurationSource;
}

/**
 * Closes an active call: works out what was actually talked, moves the money,
 * and writes the terminal row.
 *
 * Duration comes from the call-app's event log rather than the hangup request.
 * The client's own figure is persisted beside it purely so a drifting pipeline
 * shows up as a gap between the two instead of as quietly wrong invoices.
 *
 * Shared by the hangup path and the stale-active resolver so a call that ends
 * by timeout settles on exactly the same terms as one ended by a person.
 */
export const settleActiveCall = async (
  client: QueryRunner,
  call: InstantCallRow,
  clientReportedSeconds: number,
): Promise<SettlementOutcome> => {
  const capSeconds = call.seconds_allotted;
  const events = await eventsRepo.listAllByCallId(call.id);
  const derived = deriveBillableSeconds(events, clientReportedSeconds, {
    connectedAt: call.connected_at,
    endedAt: nowUtc(),
  });

  if (derived.source === DurationSource.WALL_CLOCK) {
    logger.warn(
      { callId: call.id, clientReportedSeconds, billedSeconds: derived.billableSeconds },
      'instant-call billed from wall clock — call-app event log was empty',
    );
  }

  const billedSeconds = Math.min(derived.billableSeconds, capSeconds);
  const minBillable = platformConfig.wallet().min_billable_seconds;
  const chargeableSeconds = billedSeconds < minBillable ? 0 : billedSeconds;

  // One rounding for the whole call. Rounding each second instead would drift
  // by up to a kobo a second against whoever the remainder favours.
  const perMinute = BigInt(call.per_minute_kobo);
  const grossKobo =
    chargeableSeconds === 0 ? 0n : (perMinute * BigInt(chargeableSeconds) + 30n) / 60n;

  // Settlement draws from minutes_escrow, which holds only what this caller
  // prepaid. Locking the balance row serialises concurrent calls against it,
  // and capping at the escrow held stops a long call from drawing the shared
  // escrow account — everyone else's prepaid minutes — negative.
  const balance = await minutesRepo.findBalanceForUpdate(
    client,
    call.caller_user_id,
    call.callee_user_id,
    call.call_type,
  );
  const escrowHeldKobo = balance ? BigInt(balance.escrow_kobo) : 0n;
  const amountKobo = grossKobo > escrowHeldKobo ? escrowHeldKobo : grossKobo;

  let settlementJournalId: string | null = null;
  if (amountKobo > 0n) {
    const settled = await settleMinutes(client, {
      callId: call.id,
      payeeUserId: call.callee_user_id,
      amountKobo,
      feeBps: platformConfig.wallet().platform_fee_bps,
    });
    settlementJournalId = settled.journalId;

    await minutesRepo.consumeSeconds(client, {
      userId: call.caller_user_id,
      professionalId: call.callee_user_id,
      callType: call.call_type,
      seconds: chargeableSeconds,
      escrowKobo: amountKobo,
    });
  }

  await repo.finalize(client, {
    callId: call.id,
    status: InstantCallStatus.ENDED,
    connectedSeconds: billedSeconds,
    settledKobo: amountKobo,
    settlementJournalId,
    clientReportedSeconds,
    durationSource: derived.source,
  });

  // The call belongs in their conversation too. Same transaction, so a
  // rolled-back settlement cannot leave a call in the thread that never
  // happened. The caller is always the client — only clients place calls.
  await recordCallEvent(client, {
    clientUserId: call.caller_user_id,
    professionalId: call.callee_user_id,
    callerUserId: call.caller_user_id,
    callId: call.id,
    callType: call.call_type,
    outcome: CallEventOutcome.COMPLETED,
    seconds: billedSeconds,
  });

  return { billedSeconds, amountKobo, source: derived.source };
};
