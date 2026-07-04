import crypto from 'node:crypto';

import { issueAgoraRtcToken } from '@lib/agora/index.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { ERROR_CODES } from '@shared/constants/error-codes.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import type { CreateCallSessionDto } from './call-sessions.schema.js';
import { isValidPartyKey } from './call-sessions.schema.js';
import * as repo from './call-sessions.repo.js';
import type { DevCallPartyKey, DevCallPartyView, DevCallSession } from './call-sessions.types.js';

const TOKEN_EXPIRES_IN_SECONDS = 3600;

// eslint-disable-next-line sonarjs/pseudo-random
const randomAgoraUid = (): number => Math.floor(Math.random() * 0x7fffffff);

const toPartyView = (session: DevCallSession, party: DevCallPartyKey): DevCallPartyView => {
  const partyData = party === 'a' ? session.party_a : session.party_b;
  const peerData = party === 'a' ? session.party_b : session.party_a;
  return {
    session_id: session.session_id,
    channel: session.channel,
    call_type: session.call_type,
    duration_minutes: session.duration_minutes,
    uid: partyData.uid,
    agora_token: partyData.agora_token,
    token_expires_at: partyData.token_expires_at,
    peer_uid: peerData.uid,
  };
};

export const createSession = async (
  dto: CreateCallSessionDto,
): Promise<ServiceSuccess<DevCallSession> | ServiceError> => {
  const sessionId = crypto.randomUUID().replace(/-/g, '');
  const channel = `test_${sessionId}`;

  const uidA = randomAgoraUid();
  const uidB = randomAgoraUid();

  const tokenA = issueAgoraRtcToken({
    channelName: channel,
    uid: uidA,
    role: 'publisher',
    expiresInSeconds: TOKEN_EXPIRES_IN_SECONDS,
  });

  const tokenB = issueAgoraRtcToken({
    channelName: channel,
    uid: uidB,
    role: 'publisher',
    expiresInSeconds: TOKEN_EXPIRES_IN_SECONDS,
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7200 * 1000);

  const session: DevCallSession = {
    session_id: sessionId,
    channel,
    call_type: dto.call_type,
    duration_minutes: dto.duration_minutes,
    label: dto.label ?? null,
    expires_at: expiresAt.toISOString(),
    party_a: {
      uid: uidA,
      agora_token: tokenA.token,
      token_expires_at: tokenA.expiresAt.toISOString(),
    },
    party_b: {
      uid: uidB,
      agora_token: tokenB.token,
      token_expires_at: tokenB.expiresAt.toISOString(),
    },
  };

  await repo.save(session);

  return new ServiceSuccess(session, MESSAGE_KEYS.DEV_CALL_SESSION_CREATED);
};

export const getParty = async (
  sessionId: string,
  party: string,
): Promise<ServiceSuccess<DevCallPartyView> | ServiceError> => {
  if (!isValidPartyKey(party)) {
    return new ServiceError(
      ERROR_CODES.VALIDATION_ERROR,
      MESSAGE_KEYS.DEV_CALL_SESSION_NOT_FOUND,
      400,
    );
  }

  const session = await repo.findById(sessionId);
  if (!session) {
    return new ServiceError(ERROR_CODES.NOT_FOUND, MESSAGE_KEYS.DEV_CALL_SESSION_NOT_FOUND, 404);
  }

  return new ServiceSuccess(toPartyView(session, party), MESSAGE_KEYS.DEV_CALL_SESSION_FETCHED);
};
