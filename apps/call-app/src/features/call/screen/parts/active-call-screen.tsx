import { CALL_PHASE, type CallPhase } from '@shared/bridge/bridge.types.js';
import { DurationCountdown } from './duration-countdown.js';

interface Props {
  phase: CallPhase;
  peerName: string;
  peerAvatarUrl: string | null;
  muted: boolean;
  connectedAt: number | null;
  durationMinutes: number | null;
  accumulatedPausedMs: number;
  durationPaused: boolean;
  onMute: () => void;
  onHangup: () => void;
}

function PeerAvatar({ name, url }: { name: string; url: string | null }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-28 h-28 rounded-full object-cover ring-4 ring-white/30 shadow-2xl"
      />
    );
  }

  return (
    <div className="w-28 h-28 rounded-full ring-4 ring-white/30 shadow-2xl overflow-hidden flex items-center justify-center bg-indigo-600 text-white text-3xl font-semibold">
      {initials}
    </div>
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

function PhoneDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current rotate-[135deg]">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

export function ActiveCallScreen({
  phase,
  peerName,
  peerAvatarUrl,
  muted,
  connectedAt,
  durationMinutes,
  accumulatedPausedMs,
  durationPaused,
  onMute,
  onHangup,
}: Props) {
  const isConnecting =
    phase === CALL_PHASE.JOINING ||
    phase === CALL_PHASE.CONNECTING ||
    phase === CALL_PHASE.DIALING;
  const isAlone = phase === CALL_PHASE.ALONE;
  const isActive = phase === CALL_PHASE.ACTIVE;

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden select-none">
      {/* Background */}
      {peerAvatarUrl ? (
        <img
          src={peerAvatarUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(32px)', transform: 'scale(1.18)' }}
        />
      ) : (
        <img
          src="/splash-bg.png"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Overlay — lighter at top so text is readable, fades to near-transparent toward center */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/10" />

      {/* Peer name + timer — top center */}
      <div className="relative pt-14 pb-4 flex flex-col items-center gap-1">
        <p className="text-white text-lg font-semibold tracking-wide">{peerName}</p>
        <div className="text-white/70 text-sm">
          {isActive && connectedAt != null ? (
            <DurationCountdown
              connectedAt={connectedAt}
              durationMinutes={durationMinutes}
              accumulatedPausedMs={accumulatedPausedMs}
              paused={durationPaused}
              className="text-white/70 text-sm"
            />
          ) : isConnecting ? (
            <span>{phase === CALL_PHASE.DIALING ? 'Calling…' : 'Connecting…'}</span>
          ) : isAlone ? (
            <span>Left the call</span>
          ) : null}
        </div>
      </div>

      {/* Peer avatar — vertically centered in remaining space */}
      <div className="relative flex-1 flex items-center justify-center">
        <PeerAvatar name={peerName} url={peerAvatarUrl} />
      </div>

      {/* Bottom controls pill */}
      <div className="relative flex justify-center pb-12 pt-4">
        <div className="flex items-center gap-4 bg-zinc-800/80 backdrop-blur-md rounded-full px-6 py-3">
          <button
            aria-label={muted ? 'Unmute' : 'Mute'}
            onClick={onMute}
            className={[
              'flex h-14 w-14 items-center justify-center rounded-full text-white transition-colors',
              muted ? 'bg-white/20' : 'bg-transparent hover:bg-white/10',
            ].join(' ')}
          >
            <MicIcon muted={muted} />
          </button>

          <button
            aria-label="End call"
            onClick={onHangup}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            <PhoneDownIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
