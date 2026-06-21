import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type IMicrophoneAudioTrack,
  type ICameraVideoTrack,
  type NetworkQuality,
} from 'agora-rtc-sdk-ng';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { NETWORK_QUALITY_LEVEL, type NetworkQualityLevel } from '@shared/bridge/bridge.types.js';
import { env } from '@shared/config/env.js';

// ── Agora SDK event discriminant is `kind` (not `type`) ──────────────────────

export type AgoraEventKind =
  | 'joined'
  | 'remote-joined'
  | 'remote-left'
  | 'active'
  | 'ended'
  | 'error'
  | 'muted'
  | 'camera-changed'
  | 'network-quality'
  | 'token-expiring';

export interface AgoraEvent {
  kind: AgoraEventKind;
  uid?: number;
  connectedAt?: number;
  muted?: boolean;
  cameraEnabled?: boolean;
  uplink?: NetworkQualityLevel;
  downlink?: NetworkQualityLevel;
  error?: string;
  expiresAt?: string;
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface AgoraRtcOptions {
  appId: string;
  channel: string;
  uid: number;
  token: string;
  expiresAt: string;
  callType: 'audio' | 'video';
  onEvent: (evt: AgoraEvent) => void;
}

// ── Imperative handle ─────────────────────────────────────────────────────────

export interface AgoraRtcHandle {
  mute: (muted: boolean) => void;
  setCamera: (enabled: boolean) => void;
  switchCamera: () => Promise<void>;
  setSpeaker: (enabled: boolean) => void;
  renewToken: (token: string, expiresAt: string) => Promise<void>;
  leave: () => void;
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  remoteVideoRef: React.RefObject<HTMLDivElement | null>;
}

function toQualityLevel(q: number): NetworkQualityLevel {
  if (q >= 0 && q <= 6) return q as NetworkQualityLevel;
  return NETWORK_QUALITY_LEVEL.UNKNOWN;
}

export function useAgoraRtc(options: AgoraRtcOptions | null): AgoraRtcHandle {
  const onEventRef = useRef(options?.onEvent);
  onEventRef.current = options?.onEvent;

  const expiresAtRef = useRef(options?.expiresAt ?? '');

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camRef = useRef<ICameraVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const renewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leftRef = useRef(false);

  const emit = useCallback((evt: AgoraEvent) => {
    onEventRef.current?.(evt);
  }, []);

  const scheduleExpiryWarn = useCallback((expiresAt: string) => {
    if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
    const ms = new Date(expiresAt).getTime() - Date.now() - 60_000;
    if (ms <= 0) return;
    renewTimerRef.current = setTimeout(() => {
      emit({ kind: 'token-expiring', expiresAt });
    }, ms);
  }, [emit]);

  useEffect(() => {
    if (!options) return;
    const { appId, channel, uid, token, expiresAt, callType } = options;

    leftRef.current = false;

    AgoraRTC.setLogLevel(Number(env.VITE_AGORA_LOG_LEVEL));
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') user.audioTrack?.play();
      if (mediaType === 'video' && remoteVideoRef.current) {
        user.videoTrack?.play(remoteVideoRef.current);
      }
      emit({ kind: 'remote-joined', uid: user.uid as number });
      emit({ kind: 'active', connectedAt: Date.now() });
    });

    client.on('user-left', (user: IAgoraRTCRemoteUser) => {
      emit({ kind: 'remote-left', uid: user.uid as number });
    });

    client.on('network-quality', (stats: NetworkQuality) => {
      emit({
        kind: 'network-quality',
        uplink: toQualityLevel(stats.uplinkNetworkQuality),
        downlink: toQualityLevel(stats.downlinkNetworkQuality),
      });
    });

    client.on('token-privilege-will-expire', () => {
      emit({ kind: 'token-expiring', expiresAt: expiresAtRef.current });
    });

    const start = async () => {
      try {
        await client.join(appId, channel, token, uid);
        emit({ kind: 'joined', uid });

        const mic = await AgoraRTC.createMicrophoneAudioTrack();
        micRef.current = mic;
        const tracksToPublish: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [mic];

        if (callType === 'video') {
          const cam = await AgoraRTC.createCameraVideoTrack();
          camRef.current = cam;
          tracksToPublish.push(cam);
          if (localVideoRef.current) cam.play(localVideoRef.current);
        }

        await client.publish(tracksToPublish);
        scheduleExpiryWarn(expiresAt);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Agora join failed';
        emit({ kind: 'error', error: message });
      }
    };

    void start();

    return () => {
      leftRef.current = true;
      if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
      micRef.current?.stop();
      micRef.current?.close();
      camRef.current?.stop();
      camRef.current?.close();
      void client.leave();
      clientRef.current = null;
      micRef.current = null;
      camRef.current = null;
    };
  // options object identity changes on every render so destructure key scalars only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.appId, options?.channel, options?.uid, options?.token, options?.callType]);

  const mute = useCallback((muted: boolean) => {
    void micRef.current?.setMuted(muted);
    emit({ kind: 'muted', muted });
  }, [emit]);

  const setCamera = useCallback((enabled: boolean) => {
    void camRef.current?.setMuted(!enabled);
    emit({ kind: 'camera-changed', cameraEnabled: enabled });
  }, [emit]);

  const switchCamera = useCallback(async () => {
    if (!camRef.current) return;
    const devices = await AgoraRTC.getCameras();
    if (devices.length < 2) return;
    const current = camRef.current.getTrackLabel();
    const next = devices.find((d) => d.label !== current) ?? devices[0];
    if (next) await camRef.current.setDevice(next.deviceId);
  }, []);

  const setSpeaker = useCallback((_enabled: boolean) => {
    // Web SDK does not have a speaker toggle API; a no-op here since the OS handles it.
  }, []);

  const renewToken = useCallback(async (token: string, expiresAt: string) => {
    expiresAtRef.current = expiresAt;
    await clientRef.current?.renewToken(token);
    scheduleExpiryWarn(expiresAt);
    emit({ kind: 'token-expiring' });
  }, [emit, scheduleExpiryWarn]);

  const leave = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
    micRef.current?.stop();
    micRef.current?.close();
    camRef.current?.stop();
    camRef.current?.close();
    void clientRef.current?.leave();
  }, []);

  return { mute, setCamera, switchCamera, setSpeaker, renewToken, leave, localVideoRef, remoteVideoRef };
}
