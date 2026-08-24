import { koboToJson } from '@lib/money.js';

import * as detailRepo from './admin.user-detail.repo.js';

/**
 * Assembles the wide half of the user detail payload.
 *
 * Split from `admin.users.service` so the existing `getUser` keeps its shape —
 * every field it already returned is still returned, and this adds alongside.
 * Widening a response is safe; reshaping one breaks whatever was reading it.
 *
 * Role-gated: money is only assembled for callers who may see it, and the
 * queries for it are skipped entirely rather than fetched then dropped.
 */

const MONEY_ROLES: readonly string[] = ['admin', 'finance_ops'];

const num = (raw: string | null | undefined): number => {
  if (raw === null || raw === undefined) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const iso = (date: Date | null | undefined): string | null => date?.toISOString() ?? null;

export const assemble = async (userId: string, adminRole: string | undefined) => {
  const canSeeMoney = adminRole === undefined || MONEY_ROLES.includes(adminRole);

  const [
    vitals,
    profile,
    kycExtra,
    calls,
    reviews,
    strikes,
    reports,
    sessions,
    authEvents,
    devices,
    prefs,
    tickets,
    chat,
    adminActions,
    // Money-only — skipped for roles that may not see it.
    rates,
    transactions,
    withdrawals,
    minutesHeld,
  ] = await Promise.all([
    detailRepo.vitals(userId),
    detailRepo.profileExtra(userId),
    detailRepo.kycExtra(userId),
    detailRepo.calls(userId),
    detailRepo.reviews(userId),
    detailRepo.strikes(userId),
    detailRepo.reports(userId),
    detailRepo.sessions(userId),
    detailRepo.authEvents(userId),
    detailRepo.devices(userId),
    detailRepo.prefs(userId),
    detailRepo.tickets(userId),
    detailRepo.chat(userId),
    detailRepo.adminActions(userId),
    canSeeMoney ? detailRepo.rates(userId) : [],
    canSeeMoney ? detailRepo.transactions(userId) : [],
    canSeeMoney ? detailRepo.withdrawals(userId) : [],
    canSeeMoney ? detailRepo.minutesHeld(userId) : [],
  ]);

  // A running balance, walked backwards from the current one.
  //
  // The ledger stores movements, not balances, so "balance after this entry"
  // has to be derived. Walking down from the present is the only direction
  // that is correct without reading every entry the account ever had.
  let running = num(vitals.wallet_kobo);
  const transactionsWithBalance = transactions.map((entry) => {
    const amount = num(entry.signed_amount_kobo);
    const balanceAfter = running;
    running -= amount;
    return {
      id: entry.id,
      kind: entry.kind,
      direction: amount >= 0 ? ('credit' as const) : ('debit' as const),
      amount_kobo: Math.abs(amount),
      balance_after_kobo: balanceAfter,
      memo: entry.memo,
      created_at: entry.created_at.toISOString(),
    };
  });

  return {
    vitals: {
      // The money figures inside vitals are gated too — `money: null` alone
      // would have been a fig leaf while the balance sat one key away. Non-money
      // vitals (calls, rating, strikes) stay: support needs those to do their job.
      wallet_kobo: canSeeMoney ? koboToJson(BigInt(vitals.wallet_kobo)) : null,
      lifetime_earned_kobo: canSeeMoney ? koboToJson(BigInt(vitals.lifetime_earned_kobo)) : null,
      lifetime_spent_kobo: canSeeMoney ? koboToJson(BigInt(vitals.lifetime_spent_kobo)) : null,
      escrow_kobo: canSeeMoney ? koboToJson(BigInt(vitals.escrow_kobo)) : null,
      calls_total: num(vitals.calls_total),
      calls_completed: num(vitals.calls_completed),
      calls_missed: num(vitals.calls_missed),
      // Null rather than 0 — an unrated professional has no rating, which is
      // a different fact from a rating of zero.
      rating: vitals.rating === null ? null : Number(vitals.rating),
      review_count: num(vitals.review_count),
      active_strikes: num(vitals.active_strikes),
    },

    profile: {
      cover_photo_url: profile?.cover_photo_url ?? null,
      selfie_upload_key: profile?.selfie_upload_key ?? null,
      interests: profile?.interests ?? [],
      categories: profile?.categories ?? [],
      is_available: profile?.is_available ?? false,
      handle_changed_at: iso(profile?.handle_changed_at),
    },

    kyc_extra: {
      submission_count: num(kycExtra.submission_count),
      reject_item_keys: kycExtra.reject_item_keys ?? [],
    },

    calls: calls.map((row) => ({
      id: row.id,
      counterparty_id: row.counterparty_id,
      counterparty_name: row.counterparty_name,
      direction: row.direction,
      call_type: row.call_type,
      status: row.status,
      connected_seconds: row.connected_seconds,
      settled_kobo: koboToJson(BigInt(row.settled_kobo)),
      created_at: row.created_at.toISOString(),
    })),

    reviews: reviews.map((row) => ({
      id: row.id,
      reviewer_name: row.reviewer_name,
      rating: row.rating,
      feedback: row.feedback_text,
      hidden: row.hidden_at !== null,
      created_at: row.created_at.toISOString(),
    })),

    strikes: strikes.map((row) => ({
      id: row.id,
      reason_code: row.reason_code,
      description: row.description,
      status: row.status,
      related_call_id: row.related_call_id,
      dispute_comment: row.dispute_comment,
      created_at: row.created_at.toISOString(),
    })),

    reports: reports.map((row) => ({
      id: row.id,
      direction: row.direction,
      reason_code: row.reason_code,
      status: row.status,
      counterparty_name: row.counterparty_name,
      created_at: row.created_at.toISOString(),
    })),

    sessions: sessions.map((row) => ({
      id: row.id,
      platform: row.platform,
      app_version: row.app_version,
      device_model: row.device_model,
      os_version: row.os_version,
      ip: row.ip,
      created_at: row.created_at.toISOString(),
      last_used_at: iso(row.last_used_at),
    })),

    auth_events: authEvents.map((row) => ({
      id: row.id,
      event: row.event,
      outcome: row.outcome,
      reason: row.reason,
      ip: row.ip,
      platform: row.platform,
      created_at: row.created_at.toISOString(),
    })),

    devices: devices.map((row) => ({
      // Only the tail. A push token is a credential — enough to identify the
      // row, never enough to send with.
      token_suffix: `…${row.token.slice(-6)}`,
      platform: row.platform,
      app_version: row.app_version,
      device_model: row.device_model,
      last_seen_at: row.last_seen_at.toISOString(),
    })),

    notification_prefs: {
      sms_enabled: prefs.sms_enabled,
      email_enabled: prefs.email_enabled,
      push_enabled: prefs.push_enabled,
    },

    tickets: tickets.map((row) => ({
      id: row.id,
      subject: row.subject,
      status: row.status,
      created_at: row.created_at.toISOString(),
    })),

    chat: {
      conversations: num(chat.conversations),
      messages_sent: num(chat.messages_sent),
      last_message_at: iso(chat.last_message_at),
    },

    admin_actions: adminActions.map((row) => ({
      id: row.id,
      actor: row.actor ?? 'system',
      action: row.action,
      note: row.note,
      created_at: row.created_at.toISOString(),
    })),

    // `null` rather than empty arrays for a role that may not see money: an
    // empty list says "this user has no transactions", which is a different
    // claim from "you may not see them".
    money: canSeeMoney
      ? {
          rates: rates.map((row) => ({
            id: row.id,
            call_type: row.call_type,
            duration_minutes: row.duration_minutes,
            price_kobo: koboToJson(BigInt(row.price_kobo)),
          })),
          transactions: transactionsWithBalance,
          withdrawals: withdrawals.map((row) => ({
            id: row.id,
            amount_kobo: koboToJson(BigInt(row.amount_kobo)),
            status: row.status,
            failure_reason: row.failure_reason,
            requested_at: row.requested_at.toISOString(),
            processed_at: iso(row.processed_at),
          })),
          minutes_held: minutesHeld.map((row) => ({
            counterparty_name: row.counterparty_name,
            call_type: row.call_type,
            seconds_remaining: row.seconds_remaining,
            escrow_kobo: koboToJson(BigInt(row.escrow_kobo)),
          })),
        }
      : null,
  };
};
