import { describe, expect, it } from 'vitest';

import {
  ACTIVE_PARTICIPANT_STATUSES,
  ConversationParticipantStatus,
  MAX_CONVERSATION_PARTICIPANTS,
  OCCUPYING_PARTICIPANT_STATUSES,
} from './conversation-participants.types.js';

/**
 * The seat-accounting rules, which are what stop the cap being wrong.
 *
 * These look trivial and are not: getting the occupying set wrong is how a
 * fourth person ends up in a three-person room, and it only shows up under a
 * race that is awkward to reproduce.
 */
describe('participant seat accounting', () => {
  it('counts a pending guest as occupying a seat', () => {
    // If only ACTIVE counted, a fourth could be invited while a third awaits
    // approval — and both would land the moment the professional says yes.
    expect(OCCUPYING_PARTICIPANT_STATUSES).toContain(
      ConversationParticipantStatus.PENDING_APPROVAL,
    );
    expect(OCCUPYING_PARTICIPANT_STATUSES).toContain(ConversationParticipantStatus.ACTIVE);
  });

  it('frees the seat once an invite is rejected or the guest leaves', () => {
    expect(OCCUPYING_PARTICIPANT_STATUSES).not.toContain(ConversationParticipantStatus.REJECTED);
    expect(OCCUPYING_PARTICIPANT_STATUSES).not.toContain(ConversationParticipantStatus.REMOVED);
  });

  it('lets only active participants read and post', () => {
    // A pending guest holds a seat but must not see the thread before the
    // professional has agreed.
    expect(ACTIVE_PARTICIPANT_STATUSES).toEqual([ConversationParticipantStatus.ACTIVE]);
    expect(ACTIVE_PARTICIPANT_STATUSES).not.toContain(
      ConversationParticipantStatus.PENDING_APPROVAL,
    );
  });

  it('caps a thread at three, matching calls', () => {
    // Owner + professional + one guest. The same crowd a call holds.
    expect(MAX_CONVERSATION_PARTICIPANTS).toBe(3);
  });
});
