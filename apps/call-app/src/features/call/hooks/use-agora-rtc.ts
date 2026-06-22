import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type IMicrophoneAudioTrack,
  type ICameraVideoTrack,
  type NetworkQuality,
} from 'agora-rtc-sdk-ng';
import { useCallback, useEffect, useRef } from 'react';

import { NETWORK_QUALITY_LEVEL, type NetworkQualityLevel } from '@shared/bridge/bridge.types.js';
import { env } from '@shared/config/env.js';
import { encodeStreamMsg, decodeStreamMsg } from '@shared/stream/stream.codec.js';
import type { StreamMessage } from '@shared/stream/stream.types.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const AGORA_CLIENT_EVENTS = {
  USER_PUBLISHED:              'user-published',
  USER_LEFT:                   'user-left',
  NETWORK_QUALITY:             'network-quality',
  TOKEN_PRIVILEGE_WILL_EXPIRE: 'token-privilege-will-expire',
  STREAM_MESSAGE:              'stream-message',
} as const;

const AGORA_MEDIA_TYPE = {
  AUDIO: 'audio',
  VIDEO: 'video',
} as const;

const AGORA_CLIENT_MODE = { RTC: 'rtc' } as const;
const AGORA_CODEC       = { VP8: 'vp8' } as const;

// ── Agora event kinds (internal discriminant) ─────────────────────────────────

export const AGORA_EVENT = {
  JOINED:          'joined',
  REMOTE_JOINED:   'remote-joined',
  REMOTE_LEFT:     'remote-left',
  ACTIVE:          'active',
  ENDED:           'ended',
  ERROR:           'error',
  MUTED:           'muted',
  CAMERA_CHANGED:  'camera-changed',
  NETWORK_QUALITY: 'network-quality',
  TOKEN_EXPIRING:  'token-expiring',
  STREAM_MESSAGE:  'stream-message',
} as const;

export type AgoraEventKind = (typeof AGORA_EVENT)[keyof typeof AGORA_EVENT];

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
  streamMsg?: StreamMessage;
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
  sendStream: (msg: StreamMessage) => void;
  leave: () => void;
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  remoteVideoRef: React.RefObject<HTMLDivElement | null>;
}

// ── sendStreamMessage shim ────────────────────────────────────────────────────
// The method exists at runtime in agora-rtc-sdk-ng@4.x but is absent from the
// public TypeScript declarations. Cast through unknown to call it safely.

function sendStreamMessage(client: IAgoraRTCClient, bytes: Uint8Array): void {
  try {
    (client as unknown as { sendStreamMessage: (data: Uint8Array) => Promise<void> })
      .sendStreamMessage(bytes)
      .catch((err: unknown) => {
        console.warn('[stream] sendStreamMessage failed:', err);
      });
  } catch (err) {
    console.warn('[stream] sendStreamMessage threw:', err);
  }
}

// ── Voice activity detection ──────────────────────────────────────────────────

const VAD_INTERVAL_MS     = 80;
const VAD_RMS_THRESHOLD   = 0.015;
const VAD_STOP_DEBOUNCE   = 300;

function computeRms(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const sample = (data[i]! - 128) / 128;
    sum += sample * sample;
  }
  return Math.sqrt(sum / data.length);
}

function startVoiceActivityDetection(
  track: IMicrophoneAudioTrack,
  onSpeaking: () => void,
  onSpeakingStopped: () => void,
  isMutedRef: { current: boolean },
): () => void {
  const mediaStream = new MediaStream([track.getMediaStreamTrack()]);
  const audioCtx    = new AudioContext();
  const source      = audioCtx.createMediaStreamSource(mediaStream);
  const analyser    = audioCtx.createAnalyser();
  analyser.fftSize  = 256;
  source.connect(analyser);

  const buffer = new Uint8Array(analyser.frequencyBinCount);
  let speaking  = false;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;

  const tick = () => {
    analyser.getByteTimeDomainData(buffer);
    const active = computeRms(buffer) > VAD_RMS_THRESHOLD;

    if (active) {
      if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
      if (!speaking && !isMutedRef.current) {
        speaking = true;
        onSpeaking();
      }
    } else if (speaking && !stopTimer) {
      stopTimer = setTimeout(() => {
        speaking  = false;
        stopTimer = null;
        onSpeakingStopped();
      }, VAD_STOP_DEBOUNCE);
    }
  };

  const intervalId = setInterval(tick, VAD_INTERVAL_MS);

  return () => {
    clearInterval(intervalId);
    if (stopTimer) clearTimeout(stopTimer);
    source.disconnect();
    void audioCtx.close();
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function toQualityLevel(q: number): NetworkQualityLevel {
  if (q >= 0 && q <= 6) return q as NetworkQualityLevel;
  return NETWORK_QUALITY_LEVEL.UNKNOWN;
}

export function useAgoraRtc(options: AgoraRtcOptions | null): AgoraRtcHandle {
  const onEventRef   = useRef(options?.onEvent);
  onEventRef.current = options?.onEvent;

  const expiresAtRef = useRef(options?.expiresAt ?? '');

  const clientRef      = useRef<IAgoraRTCClient | null>(null);
  const micRef         = useRef<IMicrophoneAudioTrack | null>(null);
  const camRef         = useRef<ICameraVideoTrack | null>(null);
  const localVideoRef  = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const renewTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leftRef        = useRef(false);
  // Tracks local mute state for VAD — suppresses speaking broadcasts when muted.
  const mutedRef       = useRef(false);

  const emit = useCallback((evt: AgoraEvent) => {
    onEventRef.current?.(evt);
  }, []);

  const scheduleExpiryWarn = useCallback((expiresAt: string) => {
    if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
    const ms = new Date(expiresAt).getTime() - Date.now() - 60_000;
    if (ms <= 0) return;
    renewTimerRef.current = setTimeout(() => {
      emit({ kind: AGORA_EVENT.TOKEN_EXPIRING, expiresAt });
    }, ms);
  }, [emit]);

  useEffect(() => {
    if (!options) return;
    const { appId, channel, uid, token, expiresAt, callType } = options;

    leftRef.current   = false;
    mutedRef.current  = false;

    AgoraRTC.setLogLevel(Number(env.VITE_AGORA_LOG_LEVEL));
    const client = AgoraRTC.createClient({ mode: AGORA_CLIENT_MODE.RTC, codec: AGORA_CODEC.VP8 });
    clientRef.current = client;

    // Guard: only handle audio/video publishes — ignore datachannel mediaType.
    client.on(AGORA_CLIENT_EVENTS.USER_PUBLISHED, async (user: IAgoraRTCRemoteUser, mediaType: string) => {
      if (mediaType !== AGORA_MEDIA_TYPE.AUDIO && mediaType !== AGORA_MEDIA_TYPE.VIDEO) return;
      await client.subscribe(user, mediaType as 'audio' | 'video');
      if (mediaType === AGORA_MEDIA_TYPE.AUDIO) user.audioTrack?.play();
      if (mediaType === AGORA_MEDIA_TYPE.VIDEO && remoteVideoRef.current) {
        user.videoTrack?.play(remoteVideoRef.current);
      }
      emit({ kind: AGORA_EVENT.REMOTE_JOINED, uid: user.uid as number });
      emit({ kind: AGORA_EVENT.ACTIVE, connectedAt: Date.now() });
    });

    client.on(AGORA_CLIENT_EVENTS.USER_LEFT, (user: IAgoraRTCRemoteUser) => {
      emit({ kind: AGORA_EVENT.REMOTE_LEFT, uid: user.uid as number });
    });

    client.on(AGORA_CLIENT_EVENTS.NETWORK_QUALITY, (stats: NetworkQuality) => {
      emit({
        kind:     AGORA_EVENT.NETWORK_QUALITY,
        uplink:   toQualityLevel(stats.uplinkNetworkQuality),
        downlink: toQualityLevel(stats.downlinkNetworkQuality),
      });
    });

    client.on(AGORA_CLIENT_EVENTS.TOKEN_PRIVILEGE_WILL_EXPIRE, () => {
      emit({ kind: AGORA_EVENT.TOKEN_EXPIRING, expiresAt: expiresAtRef.current });
    });

    client.on(AGORA_CLIENT_EVENTS.STREAM_MESSAGE, (senderUid: number, data: Uint8Array) => {
      const msg = decodeStreamMsg(data);
      console.debug('[stream] received from', senderUid, msg);
      if (msg) emit({ kind: AGORA_EVENT.STREAM_MESSAGE, uid: senderUid, streamMsg: msg });
    });

    let stopVad: (() => void) | null = null;

    const start = async () => {
      try {
        await client.join(appId, channel, token, uid);
        emit({ kind: AGORA_EVENT.JOINED, uid });

        const mic = await AgoraRTC.createMicrophoneAudioTrack();
        micRef.current = mic;
        const tracksToPublish: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [mic];

        if (callType === AGORA_MEDIA_TYPE.VIDEO) {
          const cam = await AgoraRTC.createCameraVideoTrack();
          camRef.current = cam;
          tracksToPublish.push(cam);
          if (localVideoRef.current) cam.play(localVideoRef.current);
        }

        await client.publish(tracksToPublish);
        scheduleExpiryWarn(expiresAt);

        // Start VAD. Analyser runs regardless of mute; mutedRef gates the broadcast.
        stopVad = startVoiceActivityDetection(
          mic,
          () => {
            const bytes = encodeStreamMsg({ type: 'sm:speaking', uid });
            if (bytes) sendStreamMessage(client, bytes);
          },
          () => {
            const bytes = encodeStreamMsg({ type: 'sm:speaking-stopped', uid });
            if (bytes) sendStreamMessage(client, bytes);
          },
          mutedRef,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Agora join failed';
        emit({ kind: AGORA_EVENT.ERROR, error: message });
      }
    };

    void start();

    return () => {
      leftRef.current = true;
      stopVad?.();
      if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
      micRef.current?.stop();
      micRef.current?.close();
      camRef.current?.stop();
      camRef.current?.close();
      void client.leave();
      clientRef.current = null;
      micRef.current    = null;
      camRef.current    = null;
    };
  // options object identity changes on every render — destructure key scalars only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.appId, options?.channel, options?.uid, options?.token, options?.callType]);

  const mute = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    void micRef.current?.setMuted(muted);
    emit({ kind: AGORA_EVENT.MUTED, muted });
  }, [emit]);

  const setCamera = useCallback((enabled: boolean) => {
    void camRef.current?.setMuted(!enabled);
    emit({ kind: AGORA_EVENT.CAMERA_CHANGED, cameraEnabled: enabled });
  }, [emit]);

  const switchCamera = useCallback(async () => {
    if (!camRef.current) return;
    const devices = await AgoraRTC.getCameras();
    if (devices.length < 2) return;
    const current = camRef.current.getTrackLabel();
    const next    = devices.find((d) => d.label !== current) ?? devices[0];
    if (next) await camRef.current.setDevice(next.deviceId);
  }, []);

  const setSpeaker = useCallback((_enabled: boolean) => {
    // Web SDK has no speaker toggle API — OS handles output device selection.
  }, []);

  const renewToken = useCallback(async (token: string, expiresAt: string) => {
    expiresAtRef.current = expiresAt;
    await clientRef.current?.renewToken(token);
    scheduleExpiryWarn(expiresAt);
    emit({ kind: AGORA_EVENT.TOKEN_EXPIRING });
  }, [emit, scheduleExpiryWarn]);

  const sendStream = useCallback((msg: StreamMessage) => {
    const bytes = encodeStreamMsg(msg);
    if (!bytes) return;
    if (!clientRef.current) { console.warn('[stream] sendStream: no client'); return; }
    console.debug('[stream] sending', msg);
    sendStreamMessage(clientRef.current, bytes);
  }, []);

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

  return { mute, setCamera, switchCamera, setSpeaker, renewToken, sendStream, leave, localVideoRef, remoteVideoRef };
}
