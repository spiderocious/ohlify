import crypto from 'node:crypto';

import { Router, type IRouter } from 'express';
import { z } from 'zod';

import { agoraUidForUserId, issueAgoraRtcToken } from '@lib/agora/index.js';
import { validate } from '@lib/http/validateRequest.js';
import { logger } from '@lib/logger.js';
import { ResponseUtil } from '@lib/response.js';

// ── Dev-only Agora token mint ────────────────────────────────────────────────
//
// Tiny no-auth endpoint for live demo + manual QA of the call harness. Takes
// a free-text channel name + display name, returns an Agora RTC token plus a
// stable UID derived from the display name. NO database touched, NO money
// moved, NO booking created. Just signs a token off the backend's App
// Certificate.
//
// Mounted only when NODE_ENV !== 'production' (see app.ts). In prod the
// route doesn't exist, so there's no risk of unauthenticated token minting.
//
// Use case: open the test-area-web demo page, click "host", get tokens,
// open another tab, click "join", get tokens, the two tabs talk via Agora.

const TokenRequestSchema = z
  .object({
    channel: z.string().min(1).max(64),
    display_name: z.string().min(1).max(64),
    with_video: z.boolean().optional(),
  })
  .strict();

const router: IRouter = Router();

router.post('/agora-token', validate(TokenRequestSchema), (req, res) => {
  const { channel, display_name } = req.body as z.infer<typeof TokenRequestSchema>;

  // UID: derive deterministically from display_name so re-joining with the
  // same name gives the same UID (avoids ghost participants in the
  // channel). Random salt would force users to refresh on each join.
  const uid = agoraUidForUserId(`dev:${display_name}`);

  const token = issueAgoraRtcToken({
    channelName: channel,
    uid,
    role: 'publisher',
    expiresInSeconds: 3600,
  });

  logger.info(
    { channel, display_name, uid, requestId: req.headers['x-request-id'] },
    'dev agora token minted',
  );

  ResponseUtil.ok(res, {
    app_id: token.appId,
    channel: token.channelName,
    uid: token.uid,
    token: token.token,
    display_name,
    expires_at: token.expiresAt.toISOString(),
    // Echo a request id so the page can correlate logs.
    request_id: crypto.randomUUID(),
  });
});

export default router;
