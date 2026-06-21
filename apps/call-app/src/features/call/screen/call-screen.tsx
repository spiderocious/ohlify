import { useCallback, useRef } from 'react';

import { CALL_PHASE, PERMISSION_KIND } from '@shared/bridge/bridge.types.js';
import { useCallBridge } from '../hooks/use-call-bridge.js';
import { useAgoraRtc, type AgoraEvent } from '../hooks/use-agora-rtc.js';
import { useCallMachine } from '../hooks/use-call-machine.js';
import { CallVideoLayout } from './parts/call-video-layout.js';
import { DurationCountdown } from './parts/duration-countdown.js';
import { PermissionErrorScreen } from './parts/permission-error-screen.js';
import { ActiveCallScreen } from './parts/active-call-screen.js';

export function CallScreen() {
  const bridge = useCallBridge();

  const rtcLeave = useRef<() => void>(() => {});
  const machine = useCallMachine(bridge.emit, useCallback(() => rtcLeave.current(), []));

  const handleAgoraEvent = useCallback(
    (evt: AgoraEvent) => machine.handleAgoraEvent(evt),
    [machine],
  );

  const agoraOptions = machine.state.agoraOptions
    ? { ...machine.state.agoraOptions, onEvent: handleAgoraEvent }
    : null;

  const rtc = useAgoraRtc(agoraOptions);
  rtcLeave.current = rtc.leave;

  bridge.onCommand(machine.handleBridgeCommand);

  const { state, hangup } = machine;
  const jp = state.joinParams;

  if (state.phase === CALL_PHASE.PERMISSION_ERROR) {
    return (
      <div className="flex h-full w-full bg-zinc-950">
        <PermissionErrorScreen kind={jp?.call_type === 'video' ? PERMISSION_KIND.CAMERA : PERMISSION_KIND.MICROPHONE} />
      </div>
    );
  }

  if (state.phase === CALL_PHASE.ENDED) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950">
        <p className="text-zinc-400 text-sm">Call ended</p>
      </div>
    );
  }

  if (state.phase === CALL_PHASE.ERROR) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950">
        <p className="text-red-400 text-sm">Connection error. Please try again.</p>
      </div>
    );
  }

  if (!jp || state.phase === CALL_PHASE.WAITING) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950">
        <p className="text-zinc-500 text-sm">Waiting for call...</p>
      </div>
    );
  }

  const isVideo = jp.call_type === 'video';
  const isActive = state.phase === CALL_PHASE.ACTIVE;

  if (isVideo && isActive) {
    return (
      <div className="flex flex-col h-full w-full bg-zinc-950 text-white select-none">
        <div className="flex-1 relative">
          <CallVideoLayout localVideoRef={rtc.localVideoRef} remoteVideoRef={rtc.remoteVideoRef} />
        </div>
        <div className="flex items-center justify-center gap-6 px-6 pb-8 pt-4">
          {state.connectedAt != null && (
            <DurationCountdown
              connectedAt={state.connectedAt}
              durationMinutes={jp.duration_minutes}
              accumulatedPausedMs={state.accumulatedPausedMs}
              paused={state.durationPaused}
            />
          )}
          <button
            aria-label={state.muted ? 'Unmute' : 'Mute'}
            onClick={() => rtc.mute(!state.muted)}
            className={[
              'flex h-14 w-14 items-center justify-center rounded-full text-white transition-colors',
              state.muted ? 'bg-zinc-500' : 'bg-zinc-700 hover:bg-zinc-600',
            ].join(' ')}
          >
            <MicIcon muted={state.muted} />
          </button>
          <button
            aria-label="End call"
            onClick={hangup}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <PhoneIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActiveCallScreen
      phase={state.phase}
      peerName={jp.peer_name}
      peerAvatarUrl={jp.peer_avatar_key}
      localName={jp.local_name}
      localAvatarUrl={jp.local_avatar_key}
      muted={state.muted}
      connectedAt={state.connectedAt}
      durationMinutes={jp.duration_minutes}
      accumulatedPausedMs={state.accumulatedPausedMs}
      durationPaused={state.durationPaused}
      onMute={() => rtc.mute(!state.muted)}
      onHangup={hangup}
    />
  );
}

function MicIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3 3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current rotate-[135deg]">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}
