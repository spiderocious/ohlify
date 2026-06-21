import { redis } from '@lib/redis/client.js';

import type { DevCallSession } from './call-sessions.types.js';

const SESSION_TTL_SECONDS = 7200; // 2 hours

const key = (sessionId: string): string => `dev:call-session:${sessionId}`;

export const save = async (session: DevCallSession): Promise<void> => {
  await redis.setex(key(session.session_id), SESSION_TTL_SECONDS, JSON.stringify(session));
};

export const findById = async (sessionId: string): Promise<DevCallSession | null> => {
  const raw = await redis.get(key(sessionId));
  if (!raw) return null;
  return JSON.parse(raw) as DevCallSession;
};
