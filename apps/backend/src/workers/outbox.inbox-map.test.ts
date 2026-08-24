import { describe, expect, it } from 'vitest';

import { OutboxEventType } from '@lib/outbox/events.js';

import { inboxEntryFor } from './outbox.inbox-map.js';

/**
 * Guards the selection rule, which is the whole design of the panel.
 *
 * The rule (`notifications.types.ts`): a row is warranted when something
 * happened TO this user that they would want to find again AND it has no other
 * natural home. Routine traffic — messages, missed calls, ordinary wallet
 * movements — is excluded on purpose, because mirroring the Chats/Calls/wallet
 * tabs buries the rows that matter.
 *
 * The exclusions below are therefore assertions about intent, not about
 * unimplemented cases. Deleting one changes the product.
 */
describe('events that earn a panel row', () => {
  it('surfaces a reversed withdrawal — the ledger cannot say why', () => {
    const entry = inboxEntryFor({
      eventType: OutboxEventType.WITHDRAWAL_REVERSED,
      payload: { user_id: 'u_1' },
    });

    expect(entry?.userId).toBe('u_1');
    expect(entry?.deeplink).toBe('withdrawals');
  });

  it('points a refund at the call it came from', () => {
    const entry = inboxEntryFor({
      eventType: OutboxEventType.CALL_REFUNDED,
      payload: { payer_user_id: 'u_1', call_id: 'cl_9' },
    });

    expect(entry?.userId).toBe('u_1');
    expect(entry?.deeplink).toBe('call_detail?call_id=cl_9');
  });

  it('falls back to the wallet when a refund has no call id', () => {
    const entry = inboxEntryFor({
      eventType: OutboxEventType.CALL_REFUNDED,
      payload: { payer_user_id: 'u_1' },
    });

    expect(entry?.deeplink).toBe('wallet');
  });

  it('routes a KYC rejection to the KYC screen, not the profile', () => {
    const entry = inboxEntryFor({
      eventType: OutboxEventType.KYC_REJECTED,
      payload: { user_id: 'u_1' },
    });

    expect(entry?.deeplink).toBe('kyc');
  });

  it('sends a review to the professional who received it', () => {
    const entry = inboxEntryFor({
      eventType: OutboxEventType.REVIEW_POSTED,
      payload: { professional_id: 'u_pro' },
    });

    expect(entry?.userId).toBe('u_pro');
    expect(entry?.deeplink).toBe('professional?id=u_pro');
  });

  it('surfaces an admin strike', () => {
    const entry = inboxEntryFor({
      eventType: OutboxEventType.STRIKE_ISSUED_BY_ADMIN,
      payload: { user_id: 'u_1' },
    });

    expect(entry?.deeplink).toBe('strikes');
  });
});

describe('routine traffic stays out of the panel', () => {
  it.each([
    ['a chat message', OutboxEventType.PUSH_CHAT_MESSAGE],
    ['a missed call', OutboxEventType.PUSH_CALL_MISSED],
    ['a successful funding', OutboxEventType.WALLET_FUNDING_SUCCEEDED],
    ['a minutes purchase', OutboxEventType.MINUTES_PURCHASED],
    ['a settled call', OutboxEventType.CALL_SETTLED],
  ])('excludes %s — the tab already lists it', (_label, eventType) => {
    // These still PUSH. Push is the interrupt; the panel is the record.
    expect(inboxEntryFor({ eventType, payload: { user_id: 'u_1' } })).toBeNull();
  });
});

describe('invites earn a row despite being activity', () => {
  it('gives the professional an actionable chat-invite row', () => {
    const entry = inboxEntryFor({
      eventType: OutboxEventType.PUSH_CHAT_INVITE,
      payload: {
        target_user_id: 'u_pro',
        conversation_id: 'conv_1',
        participant_id: 'cp_1',
        inviter_full_name: 'Ada',
        invitee_full_name: 'Bode',
      },
    });

    expect(entry?.userId).toBe('u_pro');
    expect(entry?.deeplink).toBe('chat_thread?conversation_id=conv_1');
    // The ids are what let the row render Approve / Reject instead of just
    // deep-linking somewhere else to decide.
    expect(entry?.metadata).toMatchObject({ action: 'chat_invite', participant_id: 'cp_1' });
  });

  it('gives the professional an actionable call-invite row', () => {
    const entry = inboxEntryFor({
      eventType: OutboxEventType.PUSH_CALL_INVITE_REQUESTED,
      payload: {
        target_user_id: 'u_pro',
        call_id: 'ic_1',
        participant_id: 'cp_2',
        inviter_full_name: 'Ada',
        invitee_full_name: 'Bode',
      },
    });

    expect(entry?.metadata).toMatchObject({ action: 'call_invite', participant_id: 'cp_2' });
    expect(entry?.deeplink).toBe('call_detail?call_id=ic_1');
  });

  it('tells the invitee they were added', () => {
    const entry = inboxEntryFor({
      eventType: OutboxEventType.PUSH_CHAT_INVITE_APPROVED,
      payload: {
        target_user_id: 'u_guest',
        conversation_id: 'conv_1',
        body: 'You were added to a chat.',
      },
    });

    expect(entry?.userId).toBe('u_guest');
    expect(entry?.body).toBe('You were added to a chat.');
  });
});

describe('malformed payloads', () => {
  it('returns null rather than writing an ownerless row', () => {
    // A row with no user_id would be invisible to everyone and still occupy
    // the outbox's success path. Better to drop it.
    expect(
      inboxEntryFor({ eventType: OutboxEventType.KYC_APPROVED, payload: {} }),
    ).toBeNull();
  });

  it('ignores an unknown event type', () => {
    expect(inboxEntryFor({ eventType: 'something.new', payload: { user_id: 'u_1' } })).toBeNull();
  });
});
