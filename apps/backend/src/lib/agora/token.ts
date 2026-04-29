import crypto from 'node:crypto';

// `agora-token` v2 ships as CommonJS with a default `module.exports` object
// and no ESM-named exports. From an ESM context we have to default-import
// and destructure — `import { RtcRole } from 'agora-token'` throws at
// runtime even though TS resolves it.
import agoraToken from 'agora-token';

import { logger } from '@lib/logger.js';

import { env } from '../../env.js';

const { RtcRole, RtcTokenBuilder } = agoraToken;

// Agora RTC token issuance.
//
// Uses the official `agora-token` package — same library every Agora server
// example reaches for. Version 2 of the package; older `agora-access-token`
// is deprecated.
//
// We expose a thin wrapper so callers don't pull RtcRole/RtcTokenBuilder
// directly and we have one place to log + validate inputs.

export type AgoraRole = 'publisher' | 'subscriber';

export interface AgoraTokenInput {
  channelName: string;
  uid: number; // 32-bit unsigned int. 0 = "any uid in channel"
  role: AgoraRole;
  expiresInSeconds: number; // typically 3600 (1h)
}

export interface AgoraTokenResult {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  expiresAt: Date;
}

const toAgoraRole = (role: AgoraRole): number =>
  role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

export const issueAgoraRtcToken = (input: AgoraTokenInput): AgoraTokenResult => {
  const { channelName, uid, role, expiresInSeconds } = input;
  if (channelName.length === 0 || channelName.length > 64) {
    throw new Error('agora token: channel name must be 1..64 chars');
  }
  if (!Number.isInteger(uid) || uid < 0 || uid > 0xffffffff) {
    throw new Error(`agora token: uid must be 32-bit unsigned int, got ${uid}`);
  }
  if (expiresInSeconds < 60 || expiresInSeconds > 24 * 3600) {
    throw new Error('agora token: expiresInSeconds must be 60..86400');
  }

  const appId = env.AGORA_APP_ID;
  const certificate = env.AGORA_APP_CERTIFICATE;

  // Diagnostic: print exact length + hex shape so a stray quote/whitespace/BOM
  // in .env becomes obvious. A clean Agora App ID + Certificate are 32-hex.
  const appIdShape = /^[0-9a-f]{32}$/.test(appId) ? 'OK (32-hex)' : 'BAD (not 32-hex)';
  const certShape = /^[0-9a-f]{32}$/.test(certificate) ? 'OK (32-hex)' : 'BAD (not 32-hex)';
  logger.info(
    {
      appIdJson: JSON.stringify(appId),
      appIdLength: appId.length,
      appIdShape,
      certLength: certificate.length,
      certShape,
    },
    'agora token mint diagnostic',
  );

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAtSec = nowSec + expiresInSeconds;

  // RtcTokenBuilder.buildTokenWithUid signs a token good for join + publish
  // (publisher role) or join only (subscriber). The library handles the
  // AccessToken2 binary layout + HMAC for us.
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    certificate,
    channelName,
    uid,
    toAgoraRole(role),
    expiresAtSec, // privilege expire (absolute epoch seconds)
    expiresAtSec, // token expire (absolute epoch seconds)
  );

  return {
    token,
    appId,
    channelName,
    uid,
    expiresAt: new Date(expiresAtSec * 1000),
  };
};

// Stable 32-bit hash of a string user id to use as Agora UID. Agora requires
// UID to be a 32-bit unsigned int; we want a deterministic mapping from our
// `u_*` ids so the same user always lands on the same UID across sessions.
// Use the low 31 bits (avoid sign-bit ambiguity in some clients).
export const agoraUidForUserId = (userId: string): number => {
  const hash = crypto.createHash('sha256').update(userId).digest();
  const n = hash.readUInt32BE(0);
  return n & 0x7fffffff;
};
