import type { PoolClient } from 'pg';

import * as authRepo from '@features/auth/auth.repo.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { publish, RealtimeEvent } from '@lib/realtime/index.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import * as chatRepo from './chat.repo.js';
import { CHAT_INVITE_MESSAGES } from './chat.messages.js';
import * as participantsRepo from './conversation-participants.repo.js';
import {
  ConversationParticipantRole,
  ConversationParticipantStatus,
  MAX_CONVERSATION_PARTICIPANTS,
} from './conversation-participants.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

/**
 * Finds the person being invited, by email.
 *
 * Email rather than handle because **clients never set one** — `handle` is a
 * professional KYC item only, and clients are the only people who can be
 * invited. Narrow on purpose: display names are read separately, and only when
 * a push actually needs them.
 *
 * Case-insensitive, because registration does not normalise email.
 *
 * This reveals whether an address has an account, which is why the route
 * carries a tight per-user rate limit. Do not remove it.
 */
const findUserByEmail = async (
  runner: QueryRunner,
  email: string,
): Promise<{ id: string; role: string } | null> => {
  const res = await runner.query<{ id: string; role: string }>(
    `SELECT id, role FROM users
      WHERE lower(email) = lower($1) AND deleted_at IS NULL
      LIMIT 1`,
    [email.trim()],
  );
  return res.rows[0] ?? null;
};

/**
 * A client invites a third person into a thread they own.
 *
 * The rules mirror `call-invites.service.ts` deliberately — a chat and a call
 * hold the same crowd under the same terms, and diverging would mean two
 * different answers to "who may add whom":
 *
 * - **Only the thread's owner may invite.** They are the one paying for the
 *   professional's time.
 * - **Professionals may never be invited.** A second professional would need a
 *   second billing relationship this flow does not model.
 * - **The professional approves.** Nobody joins a conversation the professional
 *   has not agreed to.
 * - **The guest is free.** No wallet, no minutes, no rate — the owner's
 *   arrangement covers the thread.
 */
export const invite = async (input: {
  conversationId: string;
  inviterUserId: string;
  email: string;
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const conversation = await chatRepo.findConversationByIdForUpdate(
      client,
      input.conversationId,
    );
    if (!conversation) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', CHAT_INVITE_MESSAGES.NOT_FOUND, 404);
    }

    const inviterMembership = await participantsRepo.findForUser(
      client,
      conversation.id,
      input.inviterUserId,
    );
    if (
      inviterMembership === null ||
      inviterMembership.status !== ConversationParticipantStatus.ACTIVE ||
      inviterMembership.role !== ConversationParticipantRole.OWNER
    ) {
      await client.query('ROLLBACK');
      return new ServiceError('forbidden', CHAT_INVITE_MESSAGES.FORBIDDEN, 403);
    }

    const target = await findUserByEmail(client, input.email);
    if (!target) {
      // Same-shape success — see the note in call-invites.service.ts. A 404
      // here would make this endpoint an account-existence oracle.
      await client.query('ROLLBACK');
      return new ServiceSuccess(
        { participant_id: null, user_id: null, status: 'invited_if_exists' as const },
        CHAT_INVITE_MESSAGES.CREATED,
      );
    }
    if (target.role === 'professional') {
      await client.query('ROLLBACK');
      return new ServiceError('validation_error', CHAT_INVITE_MESSAGES.INVALID_TARGET, 400, {
        email: ['Professionals cannot be invited to a chat'],
      });
    }
    if (target.id === input.inviterUserId) {
      await client.query('ROLLBACK');
      return new ServiceError('validation_error', CHAT_INVITE_MESSAGES.INVALID_TARGET, 400, {
        email: ['You are already in this chat'],
      });
    }

    const existing = await participantsRepo.findForUser(client, conversation.id, target.id);
    if (
      existing !== null &&
      (existing.status === ConversationParticipantStatus.ACTIVE ||
        existing.status === ConversationParticipantStatus.PENDING_APPROVAL)
    ) {
      await client.query('ROLLBACK');
      return new ServiceError('validation_error', CHAT_INVITE_MESSAGES.INVALID_TARGET, 400, {
        email: ['That person is already in this chat'],
      });
    }

    // A pending guest holds a seat: counting only active members would let a
    // fourth be invited while a third awaits approval.
    const occupied = await participantsRepo.countOccupying(client, conversation.id);
    if (occupied >= MAX_CONVERSATION_PARTICIPANTS) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', CHAT_INVITE_MESSAGES.ROOM_FULL, 409);
    }

    const participant = await participantsRepo.create(client, {
      conversationId: conversation.id,
      userId: target.id,
      role: ConversationParticipantRole.GUEST,
      status: ConversationParticipantStatus.PENDING_APPROVAL,
      invitedBy: input.inviterUserId,
    });

    // Same transaction as the row: the professional is only asked about an
    // invite that exists. SSE alone reaches them only while foregrounded, and
    // a decision someone is waiting on has to survive a locked phone.
    const [inviter, invitee] = await Promise.all([
      authRepo.findUserById(input.inviterUserId),
      authRepo.findUserById(target.id),
    ]);
    await insertEvent(client, {
      aggregateType: OutboxAggregateType.CHAT,
      aggregateId: conversation.id,
      eventType: OutboxEventType.PUSH_CHAT_INVITE,
      payload: {
        conversation_id: conversation.id,
        target_user_id: conversation.professional_id,
        participant_id: participant.id,
        inviter_user_id: input.inviterUserId,
        inviter_full_name: inviter?.full_name ?? 'Someone',
        invitee_user_id: target.id,
        invitee_full_name: invitee?.full_name ?? 'someone',
      },
    });

    await client.query('COMMIT');

    publish(conversation.professional_id, {
      type: RealtimeEvent.CHAT_INVITE_REQUESTED,
      data: {
        conversation_id: conversation.id,
        participant_id: participant.id,
        user_id: target.id,
      },
    });

    return new ServiceSuccess(
      { participant_id: participant.id, user_id: target.id, status: participant.status },
      CHAT_INVITE_MESSAGES.CREATED,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, conversationId: input.conversationId }, 'chat invite failed');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * The professional's ruling on a chat invite.
 *
 * Both outcomes notify the inviter — they asked and are waiting. The invitee is
 * told only on approval: a refused invite should never surface to the person
 * who was not let in.
 */
export const resolveInvite = async (input: {
  conversationId: string;
  participantId: string;
  professionalUserId: string;
  approve: boolean;
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const conversation = await chatRepo.findConversationByIdForUpdate(
      client,
      input.conversationId,
    );
    if (!conversation) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', CHAT_INVITE_MESSAGES.NOT_FOUND, 404);
    }
    if (conversation.professional_id !== input.professionalUserId) {
      await client.query('ROLLBACK');
      return new ServiceError('forbidden', CHAT_INVITE_MESSAGES.FORBIDDEN, 403);
    }

    const participant = await participantsRepo.findByIdForUpdate(client, input.participantId);
    if (!participant || participant.conversation_id !== conversation.id) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', CHAT_INVITE_MESSAGES.NOT_FOUND, 404);
    }

    const moved = await participantsRepo.transitionStatus(client, {
      participantId: participant.id,
      from: [ConversationParticipantStatus.PENDING_APPROVAL],
      to: input.approve
        ? ConversationParticipantStatus.ACTIVE
        : ConversationParticipantStatus.REJECTED,
    });
    if (!moved) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', CHAT_INVITE_MESSAGES.ALREADY_RESOLVED, 409);
    }

    const invitee = await authRepo.findUserById(participant.user_id);
    const inviteeName = invitee?.full_name ?? 'Someone';

    // The inviter hears either way.
    const inviterId = participant.invited_by ?? conversation.client_user_id;
    await insertEvent(client, {
      aggregateType: OutboxAggregateType.CHAT,
      aggregateId: conversation.id,
      eventType: input.approve
        ? OutboxEventType.PUSH_CHAT_INVITE_APPROVED
        : OutboxEventType.PUSH_CHAT_INVITE_REJECTED,
      payload: {
        conversation_id: conversation.id,
        participant_id: participant.id,
        target_user_id: inviterId,
        invitee_user_id: participant.user_id,
        invitee_full_name: inviteeName,
        body: input.approve
          ? `${inviteeName} can now see this chat.`
          : `The professional declined to add ${inviteeName}.`,
      },
    });

    if (input.approve) {
      // And the invitee learns they are in.
      await insertEvent(client, {
        aggregateType: OutboxAggregateType.CHAT,
        aggregateId: conversation.id,
        eventType: OutboxEventType.PUSH_CHAT_INVITE_APPROVED,
        payload: {
          conversation_id: conversation.id,
          participant_id: participant.id,
          target_user_id: participant.user_id,
          invitee_user_id: participant.user_id,
          invitee_full_name: inviteeName,
          body: 'You were added to a chat.',
        },
      });
    }

    await client.query('COMMIT');

    publish(inviterId, {
      type: RealtimeEvent.CHAT_INVITE_RESOLVED,
      data: {
        conversation_id: conversation.id,
        participant_id: participant.id,
        status: moved.status,
      },
    });
    if (input.approve) {
      publish(participant.user_id, {
        type: RealtimeEvent.CHAT_PARTICIPANTS_CHANGED,
        data: { conversation_id: conversation.id },
      });
    }

    return new ServiceSuccess(
      { participant_id: participant.id, status: moved.status },
      input.approve ? CHAT_INVITE_MESSAGES.APPROVED : CHAT_INVITE_MESSAGES.DECLINED,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, conversationId: input.conversationId }, 'chat invite resolve failed');
    throw err;
  } finally {
    client.release();
  }
};

/** The thread's roster. Readable by anyone still in it. */
export const listParticipants = async (conversationId: string, viewerUserId: string) => {
  const membership = await participantsRepo.findForUser(pool, conversationId, viewerUserId);
  if (membership === null || membership.status !== ConversationParticipantStatus.ACTIVE) {
    return new ServiceError('not_found', CHAT_INVITE_MESSAGES.NOT_FOUND, 404);
  }
  const rows = await participantsRepo.listForConversation(conversationId);
  return new ServiceSuccess(rows, CHAT_INVITE_MESSAGES.PARTICIPANTS_LISTED);
};

/**
 * Removes a guest, or lets one leave.
 *
 * The owner may remove any guest; a guest may remove themselves. Neither the
 * owner nor the professional can be removed — a thread without either has no
 * meaning, and deleting the conversation is a different action.
 */
export const removeParticipant = async (input: {
  conversationId: string;
  participantId: string;
  actorUserId: string;
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const participant = await participantsRepo.findByIdForUpdate(client, input.participantId);
    if (!participant || participant.conversation_id !== input.conversationId) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', CHAT_INVITE_MESSAGES.NOT_FOUND, 404);
    }
    if (participant.role !== ConversationParticipantRole.GUEST) {
      await client.query('ROLLBACK');
      return new ServiceError('validation_error', CHAT_INVITE_MESSAGES.FORBIDDEN, 400);
    }

    const actor = await participantsRepo.findForUser(
      client,
      input.conversationId,
      input.actorUserId,
    );
    const actorIsOwner =
      actor !== null && actor.role === ConversationParticipantRole.OWNER;
    const actorIsSelf = participant.user_id === input.actorUserId;
    if (!actorIsOwner && !actorIsSelf) {
      await client.query('ROLLBACK');
      return new ServiceError('forbidden', CHAT_INVITE_MESSAGES.FORBIDDEN, 403);
    }

    const moved = await participantsRepo.transitionStatus(client, {
      participantId: participant.id,
      from: [ConversationParticipantStatus.ACTIVE, ConversationParticipantStatus.PENDING_APPROVAL],
      to: ConversationParticipantStatus.REMOVED,
    });
    if (!moved) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', CHAT_INVITE_MESSAGES.ALREADY_RESOLVED, 409);
    }

    await client.query('COMMIT');

    publish(participant.user_id, {
      type: RealtimeEvent.CHAT_PARTICIPANTS_CHANGED,
      data: { conversation_id: input.conversationId },
    });

    return new ServiceSuccess(
      { participant_id: participant.id, status: moved.status },
      CHAT_INVITE_MESSAGES.REMOVED,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, conversationId: input.conversationId }, 'chat participant remove failed');
    throw err;
  } finally {
    client.release();
  }
};
