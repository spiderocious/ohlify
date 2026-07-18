import { useCallback, useEffect, useRef } from 'react';

import type { JoinCallResponse } from '@ohlify/api';
import { CALL_APP_URL } from '@shared/config/call-app-url.js';

import { useRenewCallToken } from '../api/use-renew-call-token.js';

export interface CallBridgeOptions {
  /** Ref to the call-app iframe. */
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /** Agora credentials from the join API. Available before ca:ready fires. */
  joinData: JoinCallResponse | null;
  /** Caller metadata. */
  localName: string;
  localAvatarKey?: string | null;
  /** Peer metadata. */
  peerName: string;
  peerAvatarKey?: string | null;
  peerAgoraUid: number;
  /** Opaque reference forwarded to every backend event (e.g. booking_id). */
  callReference?: string | null;
  /** Called when call-app reports the call has ended. */
  onEnded: (reason: string, connectedSeconds: number) => void;
}

/**
 * Owns the postMessage bridge between this app and the call-app iframe.
 *
 * - Listens for ca:ready → posts ca:join with full credentials.
 * - Listens for ca:token-expiring → calls renew API → posts ca:renew-token.
 * - Listens for ca:ended → calls onEnded so the screen can leave + navigate.
 *
 * Returns sendHangup() for the host to trigger an end from outside the iframe.
 */
export function useCallBridge({
  iframeRef,
  joinData,
  localName,
  localAvatarKey,
  peerName,
  peerAvatarKey,
  peerAgoraUid,
  callReference,
  onEnded,
}: CallBridgeOptions) {
  const joinDataRef = useRef(joinData);
  joinDataRef.current = joinData;

  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const renewToken = useRenewCallToken(joinData?.call_id ?? '');

  const post = useCallback(
    (msg: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(msg, CALL_APP_URL);
    },
    [iframeRef],
  );

  const sendJoin = useCallback(() => {
    const d = joinDataRef.current;
    if (!d) return;
    post({
      type: 'ca:join',
      payload: {
        call_id: d.call_id,
        // backend returns agora_channel_name; call-app expects agora_channel
        agora_channel: d.agora_channel_name,
        agora_app_id: d.agora_app_id,
        agora_uid: d.agora_uid,
        agora_token: d.agora_token,
        expires_at: d.expires_at,
        call_type: d.call_type,
        duration_minutes: d.duration_minutes,
        role: 'caller',
        local_name: localName,
        local_avatar_key: localAvatarKey ?? null,
        participants: [{ uid: peerAgoraUid, name: peerName, avatar_key: peerAvatarKey ?? null }],
        peer_name: peerName,
        peer_avatar_key: peerAvatarKey ?? null,
        session_token: null,
        call_reference: callReference ?? null,
        permissions: { microphone: 'granted', camera: 'granted' },
      },
    });
  }, [post, localName, localAvatarKey, peerName, peerAvatarKey, peerAgoraUid, callReference]);

  const sendHangup = useCallback(() => {
    post({ type: 'ca:hangup' });
  }, [post]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== CALL_APP_URL) return;
      const msg = event.data as { type?: string; payload?: Record<string, unknown> } | null;
      if (!msg || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'ca:ready':
          sendJoin();
          break;

        case 'ca:token-expiring':
          renewToken.mutate(undefined, {
            onSuccess: (data) => {
              post({
                type: 'ca:renew-token',
                payload: { agora_token: data.agora_token, expires_at: data.expires_at },
              });
            },
          });
          break;

        case 'ca:ended': {
          const p = msg.payload ?? {};
          const reason = typeof p['reason'] === 'string' ? p['reason'] : 'hangup';
          const secs = typeof p['connected_seconds'] === 'number' ? p['connected_seconds'] : 0;
          onEndedRef.current(reason, secs);
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [sendJoin, renewToken, post]);

  return { sendHangup };
}
