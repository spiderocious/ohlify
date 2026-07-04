import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
  CA_EVENTS,
  CALL_PHASE,
  END_REASON,
  PERMISSION_KIND,
  PERMISSION_STATE,
  type CallPhase,
  type EndReason,
  type MsgJoin,
  type NetworkQualityLevel,
  type ParentToCallApp,
  type CallAppToParent,
} from '@shared/bridge/index.js';
import { EventService, type EventContext } from '@shared/events/index.js';
import { STREAM_MSG, STREAM_FORWARD_TO_PARENT } from '@shared/stream/stream.types.js';
import type { StreamMessage } from '@shared/stream/stream.types.js';
import { AGORA_EVENT, type AgoraEvent, type AgoraRtcOptions } from './use-agora-rtc.js';

// ── State ─────────────────────────────────────────────────────────────────────

export interface CallMachineState {
  phase: CallPhase;
  muted: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  connectedAt: number | null;
  endReason: EndReason | null;
  uplink: NetworkQualityLevel;
  downlink: NetworkQualityLevel;
  joinParams: MsgJoin['payload'] | null;
  agoraOptions: AgoraRtcOptions | null;
  // Duration pause tracking
  durationPaused: boolean;
  pausedAt: number | null;
  accumulatedPausedMs: number;
  // Remote peer state (driven by Agora native events + stream messages)
  remoteMuted: boolean;
  remoteSpeaking: boolean;
  // Network reconnection
  reconnecting: boolean;
}

type MachineAction =
  | { type: 'JOIN'; params: MsgJoin['payload'] }
  | { type: 'JOINED' }
  | { type: 'REMOTE_JOINED' }
  | { type: 'REMOTE_LEFT' }
  | { type: 'ACTIVE'; connectedAt: number }
  | { type: 'HANGUP' }
  | { type: 'END'; reason: EndReason }
  | { type: 'ERROR'; message: string }
  | { type: 'PERMISSION_ERROR' }
  | { type: 'MUTE'; muted: boolean }
  | { type: 'CAMERA'; enabled: boolean }
  | { type: 'SPEAKER'; enabled: boolean }
  | { type: 'NETWORK_QUALITY'; uplink: NetworkQualityLevel; downlink: NetworkQualityLevel }
  | { type: 'PAUSE_DURATION' }
  | { type: 'RESUME_DURATION' }
  | { type: 'REMOTE_MUTED'; muted: boolean }
  | { type: 'REMOTE_SPEAKING'; speaking: boolean }
  | { type: 'RECONNECTING' }
  | { type: 'RECONNECTED' };

const DURATION_WARNING_THRESHOLD_SECONDS = 60;

const initial: CallMachineState = {
  phase: CALL_PHASE.WAITING,
  muted: false,
  cameraEnabled: true,
  speakerEnabled: true,
  connectedAt: null,
  endReason: null,
  uplink: 0,
  downlink: 0,
  joinParams: null,
  agoraOptions: null,
  durationPaused: false,
  pausedAt: null,
  accumulatedPausedMs: 0,
  remoteMuted: false,
  remoteSpeaking: false,
  reconnecting: false,
};

function reducer(state: CallMachineState, action: MachineAction): CallMachineState {
  switch (action.type) {
    case 'JOIN':
      return {
        ...state,
        phase: CALL_PHASE.JOINING,
        joinParams: action.params,
        agoraOptions: {
          appId: action.params.agora_app_id,
          channel: action.params.agora_channel,
          uid: action.params.agora_uid,
          token: action.params.agora_token,
          expiresAt: action.params.expires_at,
          callType: action.params.call_type,
          onEvent: () => {},
        },
      };
    case 'JOINED':
      return { ...state, phase: CALL_PHASE.CONNECTING };
    case 'REMOTE_JOINED':
      if (state.phase === CALL_PHASE.ENDED || state.phase === CALL_PHASE.ERROR) return state;
      // Peer rejoined after leaving — go straight back to active, don't reset connectedAt.
      if (state.phase === CALL_PHASE.ALONE || state.phase === CALL_PHASE.ACTIVE) {
        return { ...state, phase: CALL_PHASE.ACTIVE };
      }
      return { ...state, phase: CALL_PHASE.CONNECTING };
    case 'ACTIVE':
      // Only set connectedAt the first time (when it's null).
      return {
        ...state,
        phase: CALL_PHASE.ACTIVE,
        connectedAt: state.connectedAt ?? action.connectedAt,
      };
    case 'REMOTE_LEFT':
      if (state.phase === CALL_PHASE.ENDED || state.phase === CALL_PHASE.ERROR) return state;
      return { ...state, phase: CALL_PHASE.ALONE, remoteMuted: false, remoteSpeaking: false };
    case 'REMOTE_MUTED':
      return { ...state, remoteMuted: action.muted };
    case 'REMOTE_SPEAKING':
      return { ...state, remoteSpeaking: action.speaking };
    case 'RECONNECTING':
      return { ...state, reconnecting: true };
    case 'RECONNECTED':
      return { ...state, reconnecting: false };
    case 'PAUSE_DURATION':
      if (state.durationPaused || state.phase !== CALL_PHASE.ACTIVE) return state;
      return { ...state, durationPaused: true, pausedAt: Date.now() };
    case 'RESUME_DURATION': {
      if (!state.durationPaused || state.pausedAt === null) return state;
      const additionalPausedMs = Date.now() - state.pausedAt;
      return {
        ...state,
        durationPaused: false,
        pausedAt: null,
        accumulatedPausedMs: state.accumulatedPausedMs + additionalPausedMs,
      };
    }
    case 'HANGUP':
      return { ...state, phase: CALL_PHASE.ENDED, endReason: END_REASON.HANGUP };
    case 'END':
      if (state.phase === CALL_PHASE.ENDED) return state;
      return { ...state, phase: CALL_PHASE.ENDED, endReason: action.reason };
    case 'ERROR':
      return { ...state, phase: CALL_PHASE.ERROR };
    case 'PERMISSION_ERROR':
      return { ...state, phase: CALL_PHASE.PERMISSION_ERROR };
    case 'MUTE':
      return { ...state, muted: action.muted };
    case 'CAMERA':
      return { ...state, cameraEnabled: action.enabled };
    case 'SPEAKER':
      return { ...state, speakerEnabled: action.enabled };
    case 'NETWORK_QUALITY':
      return { ...state, uplink: action.uplink, downlink: action.downlink };
    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface CallMachineHandle {
  state: CallMachineState;
  handleBridgeCommand: (msg: ParentToCallApp) => void;
  handleAgoraEvent: (evt: AgoraEvent) => void;
  hangup: () => void;
}

export function useCallMachine(
  emitToParent: (msg: CallAppToParent) => void,
  rtcLeave: () => void,
  sendStream: (msg: StreamMessage) => void,
): CallMachineHandle {
  const [state, dispatch] = useReducer(reducer, initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Build an EventContext snapshot from current state for EventService.emit.
  const eventCtx = (): EventContext => {
    const s = stateRef.current;
    const jp = s.joinParams;
    // For 1:1 calls: the single remote participant. Extended to a map in Task 3.
    const participants = jp
      ? [
          {
            uid: jp.agora_uid,
            name: jp.local_name,
            avatar_key: jp.local_avatar_key,
            role: 'local' as const,
          },
          {
            uid: jp.participants[0]?.uid ?? 0,
            name: jp.participants[0]?.name ?? '',
            avatar_key: jp.participants[0]?.avatar_key ?? null,
            role: 'remote' as const,
          },
        ]
      : [];
    void participants; // used via ctx fields below
    return {
      call_id: jp?.call_id ?? null,
      call_reference: jp?.call_reference ?? null,
      agora_channel: jp?.agora_channel ?? null,
      local_uid: jp?.agora_uid ?? null,
      local_name: jp?.local_name ?? null,
      local_avatar_key: jp?.local_avatar_key ?? null,
      peer_uid: jp?.participants[0]?.uid ?? null,
      peer_name: jp?.participants[0]?.name ?? null,
      peer_avatar_key: jp?.participants[0]?.avatar_key ?? null,
      phase: s.phase,
      muted: s.muted,
      camera_enabled: s.cameraEnabled,
      connected_at: s.connectedAt,
      accumulated_paused_ms: s.accumulatedPausedMs,
      duration_minutes: jp?.duration_minutes ?? null,
      remote_muted: s.remoteMuted,
    };
  };

  // Phase change → notify parent.
  const prevPhaseRef = useRef<CallPhase>(CALL_PHASE.WAITING);
  useEffect(() => {
    if (state.phase === prevPhaseRef.current) return;
    prevPhaseRef.current = state.phase;
    emitToParent({ type: CA_EVENTS.PHASE, payload: { phase: state.phase } });
    // REMOTE_LEFT is emitted directly from handleAgoraEvent with full participant data.
    if (state.phase === CALL_PHASE.ENDED) {
      const s = stateRef.current;
      const connectedAt = s.connectedAt;
      const connectedSeconds =
        connectedAt !== null
          ? Math.floor((Date.now() - connectedAt - s.accumulatedPausedMs) / 1000)
          : 0;
      const endedPayload = {
        reason: s.endReason ?? END_REASON.HANGUP,
        connected_at: connectedAt,
        connected_seconds: connectedSeconds,
      };
      emitToParent({ type: CA_EVENTS.ENDED, payload: endedPayload });
      EventService.emit(CA_EVENTS.ENDED, endedPayload as Record<string, unknown>, eventCtx());
      rtcLeave();
    }
  }, [state.phase, emitToParent, rtcLeave]);

  // Duration warning timer — recalculates whenever active or pause state changes.
  const durationWarningFiredRef = useRef(false);
  useEffect(() => {
    if (state.durationPaused) return; // don't schedule while paused
    if (state.phase !== CALL_PHASE.ACTIVE || !state.connectedAt || !state.joinParams) return;
    if (state.joinParams.duration_minutes === null) return; // open-ended — no warning
    durationWarningFiredRef.current = false;
    const totalMs = state.joinParams.duration_minutes * 60 * 1000;
    const warningMs = totalMs - DURATION_WARNING_THRESHOLD_SECONDS * 1000;
    const effectiveElapsed = Date.now() - state.connectedAt - state.accumulatedPausedMs;
    const remaining = warningMs - effectiveElapsed;

    if (remaining <= 0) return;
    const timer = setTimeout(() => {
      if (durationWarningFiredRef.current) return;
      durationWarningFiredRef.current = true;
      emitToParent({
        type: CA_EVENTS.DURATION_WARNING,
        payload: { remaining_seconds: DURATION_WARNING_THRESHOLD_SECONDS },
      });
      EventService.emit(
        CA_EVENTS.DURATION_WARNING,
        { remaining_seconds: DURATION_WARNING_THRESHOLD_SECONDS },
        eventCtx(),
      );
    }, remaining);
    return () => clearTimeout(timer);
  }, [
    state.phase,
    state.connectedAt,
    state.joinParams,
    state.durationPaused,
    state.accumulatedPausedMs,
    emitToParent,
  ]);

  // Token expiry safety net: if TOKEN_EXPIRING fires and the parent hasn't sent
  // ca:renew-token within TOKEN_RENEWAL_GRACE_MS, end the call cleanly rather
  // than letting Agora drop it mid-conversation.
  const TOKEN_RENEWAL_GRACE_MS = 55_000;
  const tokenExpiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTokenExpiryTimer = useCallback(() => {
    if (tokenExpiryTimerRef.current) {
      clearTimeout(tokenExpiryTimerRef.current);
      tokenExpiryTimerRef.current = null;
    }
  }, []);

  const hangup = useCallback(() => {
    dispatch({ type: 'HANGUP' });
  }, []);

  const handleBridgeCommand = useCallback(
    (msg: ParentToCallApp) => {
      switch (msg.type) {
        case CA_EVENTS.JOIN: {
          const { permissions, call_type } = msg.payload;
          const micGranted = permissions.microphone === PERMISSION_STATE.GRANTED;
          const camGranted = permissions.camera === PERMISSION_STATE.GRANTED;

          if (!micGranted) {
            dispatch({ type: 'PERMISSION_ERROR' });
            emitToParent({
              type: CA_EVENTS.PERMISSION_NEEDED,
              payload: { kind: PERMISSION_KIND.MICROPHONE },
            });
            return;
          }
          if (call_type === 'video' && !camGranted) {
            dispatch({ type: 'PERMISSION_ERROR' });
            emitToParent({
              type: CA_EVENTS.PERMISSION_NEEDED,
              payload: { kind: PERMISSION_KIND.CAMERA },
            });
            return;
          }
          dispatch({ type: 'JOIN', params: msg.payload });
          break;
        }
        case CA_EVENTS.MUTE:
          dispatch({ type: 'MUTE', muted: msg.payload.muted });
          emitToParent({ type: CA_EVENTS.MUTED, payload: { muted: msg.payload.muted } });
          // Broadcast mute state to peers.
          sendStream({
            type: STREAM_MSG.MUTE,
            uid: stateRef.current.joinParams?.agora_uid ?? 0,
            muted: msg.payload.muted,
          });
          break;
        case CA_EVENTS.CAMERA:
          dispatch({ type: 'CAMERA', enabled: msg.payload.enabled });
          emitToParent({
            type: CA_EVENTS.CAMERA_CHANGED,
            payload: { enabled: msg.payload.enabled },
          });
          // Broadcast camera state to peers.
          sendStream({
            type: STREAM_MSG.CAMERA,
            uid: stateRef.current.joinParams?.agora_uid ?? 0,
            enabled: msg.payload.enabled,
          });
          break;
        case CA_EVENTS.SPEAKER:
          dispatch({ type: 'SPEAKER', enabled: msg.payload.enabled });
          break;
        case CA_EVENTS.HANGUP:
          dispatch({ type: 'HANGUP' });
          break;
        case CA_EVENTS.RENEW_TOKEN:
          // Cancel the expiry safety net — parent delivered the renewal in time.
          clearTokenExpiryTimer();
          emitToParent({ type: CA_EVENTS.TOKEN_RENEWED });
          EventService.emit(
            CA_EVENTS.TOKEN_RENEWED,
            { expires_at: msg.payload.expires_at },
            eventCtx(),
          );
          break;
        case CA_EVENTS.PAUSE_DURATION: {
          const s = stateRef.current;
          if (s.durationPaused || s.phase !== CALL_PHASE.ACTIVE) break;
          dispatch({ type: 'PAUSE_DURATION' });
          const elapsedSeconds =
            s.connectedAt !== null
              ? Math.floor((Date.now() - s.connectedAt - s.accumulatedPausedMs) / 1000)
              : 0;
          emitToParent({
            type: CA_EVENTS.DURATION_PAUSED,
            payload: { elapsed_seconds: elapsedSeconds },
          });
          break;
        }
        case CA_EVENTS.RESUME_DURATION: {
          const s = stateRef.current;
          if (!s.durationPaused || s.pausedAt === null) break;
          const additionalPausedMs = Date.now() - s.pausedAt;
          const totalPausedMs = s.accumulatedPausedMs + additionalPausedMs;
          dispatch({ type: 'RESUME_DURATION' });
          const elapsedSeconds =
            s.connectedAt !== null
              ? Math.floor((Date.now() - s.connectedAt - totalPausedMs) / 1000)
              : 0;
          emitToParent({
            type: CA_EVENTS.DURATION_RESUMED,
            payload: { elapsed_seconds: elapsedSeconds },
          });
          break;
        }
        case CA_EVENTS.STREAM_SEND: {
          // Parent instructs call-app to broadcast a custom stream message to all peers.
          const { msg_type, payload: streamPayload } = msg.payload;
          sendStream({
            type: msg_type,
            uid: stateRef.current.joinParams?.agora_uid ?? 0,
            ...(streamPayload ?? {}),
          } as StreamMessage);
          break;
        }
        default:
          break;
      }
    },
    [emitToParent, sendStream],
  );

  const handleAgoraEvent = useCallback(
    (evt: AgoraEvent) => {
      switch (evt.kind) {
        case AGORA_EVENT.JOINED:
          dispatch({ type: 'JOINED' });
          if (evt.uid !== undefined) emitToParent({ type: CA_EVENTS.JOINED, payload: { uid: evt.uid } });
          EventService.emit(CA_EVENTS.JOINED, { uid: evt.uid ?? null }, eventCtx());
          break;
        case AGORA_EVENT.REMOTE_JOINED: {
          dispatch({ type: 'REMOTE_JOINED' });
          const jp = stateRef.current.joinParams;
          if (jp) {
            const local = {
              uid: jp.agora_uid,
              name: jp.local_name,
              avatar_key: jp.local_avatar_key,
            };
            const remote = {
              uid: evt.uid ?? 0,
              name: jp.participants[0]?.name ?? jp.peer_name,
              avatar_key: jp.participants[0]?.avatar_key ?? jp.peer_avatar_key,
            };
            emitToParent({
              type: CA_EVENTS.REMOTE_JOINED,
              payload: { joined: remote, participants: [local, remote] },
            });
          }
          EventService.emit(CA_EVENTS.REMOTE_JOINED, { uid: evt.uid ?? null }, eventCtx());
          break;
        }
        case AGORA_EVENT.REMOTE_LEFT: {
          dispatch({ type: 'REMOTE_LEFT' });
          const jp = stateRef.current.joinParams;
          if (jp) {
            const local = {
              uid: jp.agora_uid,
              name: jp.local_name,
              avatar_key: jp.local_avatar_key,
            };
            const remote = {
              uid: evt.uid ?? 0,
              name: jp.participants[0]?.name ?? jp.peer_name,
              avatar_key: jp.participants[0]?.avatar_key ?? jp.peer_avatar_key,
            };
            emitToParent({
              type: CA_EVENTS.REMOTE_LEFT,
              payload: { left: remote, remaining: [local] },
            });
          }
          EventService.emit(CA_EVENTS.REMOTE_LEFT, { uid: evt.uid ?? null }, eventCtx());
          break;
        }
        case AGORA_EVENT.REMOTE_MUTED:
          if (evt.muted !== undefined) dispatch({ type: 'REMOTE_MUTED', muted: evt.muted });
          break;
        case AGORA_EVENT.ACTIVE:
          dispatch({ type: 'ACTIVE', connectedAt: evt.connectedAt ?? Date.now() });
          emitToParent({
            type: CA_EVENTS.ACTIVE,
            payload: { connected_at: evt.connectedAt ?? Date.now() },
          });
          EventService.emit(
            CA_EVENTS.ACTIVE,
            { connected_at: evt.connectedAt ?? Date.now() },
            eventCtx(),
          );
          break;
        case AGORA_EVENT.MUTED:
          if (evt.muted !== undefined) {
            dispatch({ type: 'MUTE', muted: evt.muted });
            emitToParent({ type: CA_EVENTS.MUTED, payload: { muted: evt.muted } });
            EventService.emit(CA_EVENTS.MUTED, { muted: evt.muted }, eventCtx());
          }
          break;
        case AGORA_EVENT.CAMERA_CHANGED:
          if (evt.cameraEnabled !== undefined) {
            dispatch({ type: 'CAMERA', enabled: evt.cameraEnabled });
            emitToParent({
              type: CA_EVENTS.CAMERA_CHANGED,
              payload: { enabled: evt.cameraEnabled },
            });
          }
          break;
        case AGORA_EVENT.NETWORK_QUALITY:
          if (evt.uplink !== undefined && evt.downlink !== undefined) {
            dispatch({ type: 'NETWORK_QUALITY', uplink: evt.uplink, downlink: evt.downlink });
            emitToParent({
              type: CA_EVENTS.NETWORK_QUALITY,
              payload: { uplink: evt.uplink, downlink: evt.downlink },
            });
            EventService.emit(
              CA_EVENTS.NETWORK_QUALITY,
              { uplink: evt.uplink, downlink: evt.downlink },
              eventCtx(),
            );
          }
          break;
        case AGORA_EVENT.STREAM_MESSAGE: {
          const msg = evt.streamMsg;
          if (!msg) break;

          // Act locally on known stream message types.
          if (msg.type === STREAM_MSG.MUTE) {
            dispatch({ type: 'REMOTE_MUTED', muted: (msg as { muted: boolean }).muted });
          } else if (msg.type === STREAM_MSG.SPEAKING) {
            dispatch({ type: 'REMOTE_SPEAKING', speaking: true });
          } else if (msg.type === STREAM_MSG.SPEAKING_STOPPED) {
            dispatch({ type: 'REMOTE_SPEAKING', speaking: false });
          }

          // Forward to parent if this type is marked for forwarding.
          if (STREAM_FORWARD_TO_PARENT.has(msg.type)) {
            const { type, uid, ...rest } = msg as StreamMessage & { uid: number };
            emitToParent({
              type: CA_EVENTS.STREAM_RECEIVED,
              payload: {
                from_uid: uid ?? evt.uid ?? 0,
                msg_type: type,
                data: rest as Record<string, unknown>,
              },
            });
          }
          break;
        }
        case AGORA_EVENT.TOKEN_EXPIRING:
          emitToParent({
            type: CA_EVENTS.TOKEN_EXPIRING,
            payload: { expires_at: evt.expiresAt ?? '' },
          });
          EventService.emit(
            CA_EVENTS.TOKEN_EXPIRING,
            { expires_at: evt.expiresAt ?? '' },
            eventCtx(),
          );
          // Safety net: if parent doesn't renew within grace period, end the call.
          clearTokenExpiryTimer();
          tokenExpiryTimerRef.current = setTimeout(() => {
            if (stateRef.current.phase === CALL_PHASE.ENDED) return;
            dispatch({ type: 'END', reason: END_REASON.TOKEN_EXPIRED });
          }, TOKEN_RENEWAL_GRACE_MS);
          break;
        case AGORA_EVENT.RECONNECTING:
          dispatch({ type: 'RECONNECTING' });
          EventService.emit(CA_EVENTS.PHASE, { phase: 'reconnecting' }, eventCtx());
          break;
        case AGORA_EVENT.RECONNECTED:
          dispatch({ type: 'RECONNECTED' });
          EventService.emit(CA_EVENTS.PHASE, { phase: 'reconnected' }, eventCtx());
          break;
        case AGORA_EVENT.ERROR:
          dispatch({ type: 'ERROR', message: evt.error ?? 'Unknown RTC error' });
          emitToParent({
            type: CA_EVENTS.ERROR,
            payload: { code: 'rtc_error', message: evt.error ?? 'Unknown RTC error' },
          });
          EventService.emit(
            CA_EVENTS.ERROR,
            { code: 'rtc_error', message: evt.error ?? 'Unknown RTC error' },
            eventCtx(),
          );
          break;
        case AGORA_EVENT.ENDED:
          dispatch({ type: 'END', reason: END_REASON.ERROR });
          break;
      }
    },
    [emitToParent],
  );

  // Clean up token expiry timer on unmount.
  useEffect(
    () => () => {
      clearTokenExpiryTimer();
    },
    [clearTokenExpiryTimer],
  );

  return { state, handleBridgeCommand, handleAgoraEvent, hangup };
}
