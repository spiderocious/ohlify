import * as authRepo from '@features/auth/auth.repo.js';
import * as ratesRepo from '@features/rates/rates.repo.js';
import { perMinuteKobo } from '@features/rates/rates.types.js';
import { withTransaction } from '@lib/db/tx.js';
import { id as makeId } from '@lib/ids.js';
import { koboToJson } from '@lib/money.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { buyMinutes } from '@lib/wallet/flows/minutes.js';

import type { CallType } from '@features/bookings/bookings.types.js';

import { MINUTES_MESSAGES } from './minutes.messages.js';
import * as repo from './minutes.repo.js';
import type { BuyMinutesDto } from './minutes.schema.js';
import type { MinuteBalanceRow, MinuteBalanceView } from './minutes.types.js';

const toBalanceView = (row: MinuteBalanceRow): MinuteBalanceView => ({
  professional_id: row.professional_id,
  call_type: row.call_type,
  minutes_remaining: row.minutes_remaining,
  rate_snapshot_kobo: koboToJson(BigInt(row.rate_snapshot_kobo)),
  escrow_kobo: koboToJson(BigInt(row.escrow_kobo)),
});

export const listMyBalances = async (userId: string) => {
  const rows = await repo.listBalancesForUser(userId);
  return new ServiceSuccess(rows.map(toBalanceView), MINUTES_MESSAGES.BALANCES_FETCHED);
};

export const getBalanceForPro = async (
  userId: string,
  professionalId: string,
  callType: CallType,
) => {
  const row = await repo.findBalance(userId, professionalId, callType);
  const view: MinuteBalanceView = row
    ? toBalanceView(row)
    : {
        professional_id: professionalId,
        call_type: callType,
        minutes_remaining: 0,
        rate_snapshot_kobo: 0,
        escrow_kobo: 0,
      };
  return new ServiceSuccess(view, MINUTES_MESSAGES.BALANCE_FETCHED);
};

export const purchase = async (dto: BuyMinutesDto, userId: string) => {
  // 1. The professional must exist and actually be a professional.
  const pro = await authRepo.findUserById(dto.professional_id);
  if (!pro || pro.role !== 'professional' || pro.deleted_at !== null) {
    return new ServiceError('professional_unavailable', MINUTES_MESSAGES.PRO_NOT_FOUND, 404);
  }

  // 2. They must have a rate for the requested call type. Derive the per-minute
  //    price (floored) — the same primitive the rate UI shows.
  const rate = await ratesRepo.findActiveByUserAndCallType(dto.professional_id, dto.call_type);
  if (!rate) {
    return new ServiceError('rate_not_found', MINUTES_MESSAGES.RATE_NOT_FOUND, 404);
  }
  const perMin = perMinuteKobo(Number(rate.price_kobo), rate.duration_minutes);
  if (perMin <= 0) {
    return new ServiceError('rate_not_found', MINUTES_MESSAGES.RATE_NOT_FOUND, 422);
  }

  // 3. Minutes bought = floor(amount / per_minute). Platform keeps the sub-minute
  //    remainder (system-wide floor rounding). Reject if it can't buy a minute.
  const amountKobo = BigInt(dto.amount_kobo);
  const perMinKobo = BigInt(perMin);
  const minutes = Number(amountKobo / perMinKobo); // integer floor division
  if (minutes <= 0) {
    return new ServiceError('value_out_of_range', MINUTES_MESSAGES.AMOUNT_TOO_LOW, 422, {
      amount_kobo: [`Minimum to buy a minute is ${perMin} kobo`],
    });
  }
  // Only the portion that actually bought whole minutes goes to escrow; the
  // sub-minute remainder stays in the user's wallet.
  const escrowKobo = perMinKobo * BigInt(minutes);

  const purchaseId = makeId('mp');

  // 4. Money movement + balance update + purchase record, atomically.
  return withTransaction(async (client) => {
    const buy = await buyMinutes(client, {
      userId,
      purchaseId,
      amountKobo: escrowKobo,
    });

    if (buy.status === 'insufficient_balance') {
      return new ServiceError('insufficient_balance', MINUTES_MESSAGES.INSUFFICIENT_WALLET, 409);
    }

    await repo.addMinutes(client, {
      userId,
      professionalId: dto.professional_id,
      callType: dto.call_type,
      minutes,
      perMinuteKobo: perMinKobo,
      amountKobo: escrowKobo,
    });

    await repo.insertPurchase(client, {
      purchaseId,
      userId,
      professionalId: dto.professional_id,
      callType: dto.call_type,
      amountKobo: escrowKobo,
      perMinuteKobo: perMinKobo,
      minutes,
      journalId: buy.journalId,
    });

    if (!buy.alreadyPosted) {
      await insertEvent(client, {
        aggregateType: OutboxAggregateType.USER,
        aggregateId: userId,
        eventType: OutboxEventType.MINUTES_PURCHASED,
        payload: {
          user_id: userId,
          professional_id: dto.professional_id,
          call_type: dto.call_type,
          minutes,
          per_minute_kobo: perMin,
          amount_kobo: Number(escrowKobo),
        },
      });
    }

    const updated = await repo.findBalanceForUpdate(
      client,
      userId,
      dto.professional_id,
      dto.call_type,
    );
    return new ServiceSuccess(
      {
        purchase_id: purchaseId,
        professional_id: dto.professional_id,
        call_type: dto.call_type,
        minutes_purchased: minutes,
        per_minute_kobo: koboToJson(perMinKobo),
        amount_charged_kobo: koboToJson(escrowKobo),
        minutes_remaining: updated?.minutes_remaining ?? minutes,
      },
      MINUTES_MESSAGES.PURCHASED,
    );
  });
};
