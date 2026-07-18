import { Show } from 'meemaw';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppButton, AppLoader, AppText } from '@ohlify/ui';
import type { InstantCallJoin, JoinCallResponse } from '@ohlify/api';

import { CallAppFrame } from '../../call-session/screen/parts/call-app-frame.js';
import { useCallBridge } from '../../call-session/screen/use-call-bridge.js';
import {
  useAnswerInstantCall,
  useEndInstantCall,
  useStartInstantCall,
} from '../api/use-instant-call.js';

// Map the instant-call join creds onto the shape the call-app bridge expects.
function toJoinData(j: InstantCallJoin): JoinCallResponse {
  return {
    call_id: j.call_id,
    agora_app_id: j.agora_app_id,
    agora_channel_name: j.agora_channel_name,
    agora_uid: j.agora_uid,
    agora_token: j.agora_token,
    expires_at: j.expires_at,
    call_type: j.call_type,
    duration_minutes: j.minutes_allotted,
    remote_user_id: j.remote_user_id,
    total_paid_kobo: 0,
  };
}

/**
 * Instant-call session. Reached as caller (`?pro=&type=`) or callee
 * (`?answer=<callId>`). Starts/answers the call, mounts the call-app iframe via
 * the shared bridge, and ends the call (reporting talk time) on hangup.
 * Foreground-only; native killed-app ringing is Phase 7.
 */
export function InstantCallScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const proId = params.get('pro') ?? '';
  const callType = params.get('type') === 'video' ? 'video' : 'audio';
  const answerCallId = params.get('answer');
  const peerName = params.get('name') ?? 'Professional';
  const peerAvatarKey = params.get('avatar') ?? undefined;

  const startCall = useStartInstantCall();
  const answerCall = useAnswerInstantCall();
  const endCall = useEndInstantCall();

  const [join, setJoin] = useState<InstantCallJoin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const onErr = (err: unknown) => {
      const e = err as { errorMessage?: string };
      setError(e.errorMessage ?? 'Could not connect the call.');
    };

    if (answerCallId) {
      answerCall.mutate(answerCallId, { onSuccess: setJoin, onError: onErr });
    } else if (proId) {
      startCall.mutate(
        { professional_id: proId, call_type: callType },
        {
          onSuccess: setJoin,
          onError: onErr,
        },
      );
    } else {
      setError('Missing call details.');
    }
  }, []);

  const onEnded = useCallback(
    (_reason: string, connectedSeconds: number) => {
      if (join) {
        endCall.mutate({ callId: join.call_id, connectedSeconds });
      }
      navigate(ROUTES.HOME.absPath, { replace: true });
    },
    [join, endCall, navigate],
  );

  const { sendHangup } = useCallBridge({
    iframeRef,
    joinData: join ? toJoinData(join) : null,
    localName: 'You',
    peerName,
    peerAvatarKey,
    peerAgoraUid: 0,
    callReference: join?.call_id ?? null,
    onEnded,
  });

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-white">
        <AppText variant="body" align="center" color="rgba(255,255,255,0.7)">
          {error}
        </AppText>
        <AppButton
          label="Go back"
          radius={100}
          height={44}
          onPressed={() => navigate(ROUTES.HOME.absPath, { replace: true })}
        />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-black">
      <Show when={!join}>
        <div className="flex min-h-screen items-center justify-center">
          <AppLoader />
        </div>
      </Show>
      <Show when={Boolean(join)}>
        <CallAppFrame ref={iframeRef} />
        <button
          type="button"
          onClick={() => sendHangup()}
          className="absolute bottom-8 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-danger text-white shadow-lg"
          aria-label="End call"
        >
          ✕
        </button>
      </Show>
    </main>
  );
}
