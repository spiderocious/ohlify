import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type IMicrophoneAudioTrack,
  type ICameraVideoTrack,
} from 'agora-rtc-sdk-ng';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { CallRole } from '@ohlify/core';
import type { JoinCallResponse } from '@ohlify/api';

export type AgoraPhaseTag = 'joining' | 'dialing' | 'connecting' | 'active' | 'ended' | 'error';

export interface AgoraPhase {
  tag: AgoraPhaseTag;
  connectedAt?: number;
  endedAt?: number;
  errorMessage?: string;
}

interface State {
  phase: AgoraPhase;
  muted: boolean;
  speakerOn: boolean;
  cameraEnabled: boolean;
  tick: number;
}

type Action =
  | { type: 'set_phase'; phase: AgoraPhase }
  | { type: 'remote_joined' }
  | { type: 'end' }
  | { type: 'error'; message: string }
  | { type: 'toggle_mute' }
  | { type: 'toggle_speaker' }
  | { type: 'toggle_camera' }
  | { type: 'tick' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set_phase':
      return { ...state, phase: action.phase };
    case 'remote_joined':
      if (state.phase.tag === 'ended' || state.phase.tag === 'error') return state;
      return { ...state, phase: { tag: 'active', connectedAt: Date.now() } };
    case 'end':
      if (state.phase.tag === 'ended') return state;
      return {
        ...state,
        phase: {
          tag: 'ended',
          connectedAt: state.phase.connectedAt,
          endedAt: Date.now(),
        },
      };
    case 'error':
      return { ...state, phase: { tag: 'error', errorMessage: action.message } };
    case 'toggle_mute':
      return { ...state, muted: !state.muted };
    case 'toggle_speaker':
      return { ...state, speakerOn: !state.speakerOn };
    case 'toggle_camera':
      return { ...state, cameraEnabled: !state.cameraEnabled };
    case 'tick':
      return { ...state, tick: state.tick + 1 };
  }
}

const initialState: State = {
  phase: { tag: 'joining' },
  muted: false,
  speakerOn: false,
  cameraEnabled: true,
  tick: 0,
};

export interface AgoraCallSessionOptions {
  role: CallRole;
  callType: 'audio' | 'video';
  joinData: JoinCallResponse;
  /** Called when the local user hangs up (before Agora leave). */
  onLeave?: (reason: 'hangup' | 'declined') => void;
  /** Called with a new token when renewal is needed. */
  onRenewToken?: () => Promise<string>;
}

export interface AgoraCallSession {
  phase: AgoraPhase;
  muted: boolean;
  speakerOn: boolean;
  cameraEnabled: boolean;
  elapsedLabel: string;
  /** Container ref to attach the remote video track to. */
  remoteVideoRef: React.RefObject<HTMLDivElement | null>;
  /** Container ref to attach the local video track to. */
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  hangup: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleCamera: () => void;
}

function formatElapsed(seconds: number): string {
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

/**
 * Real Agora RTC call session.
 * - Joins the channel on mount using credentials from `joinData`.
 * - Publishes mic track (+ camera track for video calls).
 * - Subscribes to the remote user's audio/video when they join.
 * - Drives phase transitions: joining → dialing/connecting → active → ended.
 * - Caller starts in 'dialing' (waiting for remote), callee in 'connecting'.
 */
export function useAgoraCallSession({
  role,
  callType,
  joinData,
  onLeave,
  onRenewToken,
}: AgoraCallSessionOptions): AgoraCallSession {
  const [state, dispatch] = useReducer(reducer, initialState);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const hangupCalledRef = useRef(false);
  const renewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule token renewal 60s before expiry.
  const scheduleRenewal = useCallback(
    (expiresAt: string) => {
      if (!onRenewToken) return;
      if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
      const ms = new Date(expiresAt).getTime() - Date.now() - 60_000;
      if (ms <= 0) return;
      renewTimerRef.current = setTimeout(async () => {
        try {
          const newToken = await onRenewToken();
          await clientRef.current?.renewToken(newToken);
        } catch {
          // Non-fatal — worst case Agora disconnects when token expires.
        }
      }, ms);
    },
    [onRenewToken],
  );

  useEffect(() => {
    let cancelled = false;

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    // Remote user joins and publishes tracks.
    client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
      if (mediaType === 'video' && remoteVideoRef.current) {
        user.videoTrack?.play(remoteVideoRef.current);
      }
      if (!cancelled) dispatch({ type: 'remote_joined' });
    });

    // Remote user leaves.
    client.on('user-left', () => {
      if (!cancelled) dispatch({ type: 'end' });
    });

    const start = async () => {
      try {
        await client.join(
          joinData.agora_app_id,
          joinData.agora_channel_name,
          joinData.agora_token,
          joinData.agora_uid,
        );

        // Publish local tracks.
        const tracks: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [];
        const mic = await AgoraRTC.createMicrophoneAudioTrack();
        micTrackRef.current = mic;
        tracks.push(mic);

        if (callType === 'video') {
          const cam = await AgoraRTC.createCameraVideoTrack();
          camTrackRef.current = cam;
          tracks.push(cam);
          if (localVideoRef.current) cam.play(localVideoRef.current);
        }

        await client.publish(tracks);

        scheduleRenewal(joinData.expires_at);

        if (!cancelled) {
          dispatch({
            type: 'set_phase',
            phase: { tag: role === 'callee' ? 'connecting' : 'dialing' },
          });
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to join call';
          dispatch({ type: 'error', message: msg });
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
      micTrackRef.current?.stop();
      micTrackRef.current?.close();
      camTrackRef.current?.stop();
      camTrackRef.current?.close();
      void client.leave();
      clientRef.current = null;
    };
  // Run once on mount — joinData is stable (from useJoinCall result).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick every second while active for the elapsed label.
  useEffect(() => {
    if (state.phase.tag !== 'active') return;
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(id);
  }, [state.phase.tag]);

  // Sync mute state to the actual track.
  useEffect(() => {
    void micTrackRef.current?.setMuted(state.muted);
  }, [state.muted]);

  // Sync camera enabled state to the actual track.
  useEffect(() => {
    void camTrackRef.current?.setMuted(!state.cameraEnabled);
  }, [state.cameraEnabled]);

  const hangup = useCallback(() => {
    if (hangupCalledRef.current) return;
    hangupCalledRef.current = true;
    const reason = state.phase.tag === 'connecting' && role === 'callee' ? 'declined' : 'hangup';
    micTrackRef.current?.stop();
    micTrackRef.current?.close();
    camTrackRef.current?.stop();
    camTrackRef.current?.close();
    void clientRef.current?.leave();
    onLeave?.(reason);
    dispatch({ type: 'end' });
  }, [state.phase.tag, role, onLeave]);

  const toggleMute = useCallback(() => dispatch({ type: 'toggle_mute' }), []);
  const toggleSpeaker = useCallback(() => dispatch({ type: 'toggle_speaker' }), []);
  const toggleCamera = useCallback(() => dispatch({ type: 'toggle_camera' }), []);

  const elapsed = state.phase.connectedAt
    ? Math.max(0, Math.floor(((state.phase.endedAt ?? Date.now()) - state.phase.connectedAt) / 1000))
    : 0;

  return {
    phase: state.phase,
    muted: state.muted,
    speakerOn: state.speakerOn,
    cameraEnabled: state.cameraEnabled,
    elapsedLabel: formatElapsed(elapsed),
    remoteVideoRef,
    localVideoRef,
    hangup,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
  };
}
