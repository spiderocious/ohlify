import type { ReactNode } from 'react';

import { HawkButton } from '../actions/button.js';
import { HawkIconButton } from '../actions/icon-button.js';
import { HawkAvatar } from '../display/avatar.js';
import { HawkMeter } from '../display/meter.js';
import { HawkFigure } from '../foundation/figure.js';
import { HawkIcon } from '../foundation/icon.js';
import type { HawkKobo } from '../foundation/money.js';
import { HawkText } from '../foundation/text.js';
import {
  IconAlertTriangle,
  IconChartWeak,
  IconMic,
  IconMicOff,
  IconNetworkQuality,
  IconPhone,
  IconPhoneOff,
  IconVideo,
  IconVideoOff,
  IconVolume,
  IconWifiOff,
} from '../icons/index.js';
import { HAWK_HAZARD, HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

/**
 * The call surfaces.
 *
 * All of them sit on `--hawk-call-ground` (near-black) rather than paper. The
 * call is the one place the product goes dark: it is a full-attention surface,
 * often held to the ear or watched in the dark, and it should not be the
 * brightest thing in the room.
 *
 * Every control here is `onDark`, which is why that axis exists on the button
 * family rather than being faked with opacity.
 */

export const HawkCallState = {
  DIALLING: 'dialling',
  RINGING: 'ringing',
  CONNECTING: 'connecting',
  ACTIVE: 'active',
  RECONNECTING: 'reconnecting',
  ENDED: 'ended',
} as const;
export type HawkCallState = (typeof HawkCallState)[keyof typeof HawkCallState];

const STATE_LABEL: Record<HawkCallState, string> = {
  dialling: 'Calling…',
  ringing: 'Ringing…',
  connecting: 'Connecting…',
  active: 'Connected',
  reconnecting: 'Reconnecting…',
  ended: 'Call ended',
};

export interface HawkCallSurfaceProps {
  name: string;
  avatarUrl?: string;
  state: HawkCallState;
  /** Elapsed seconds — shown once active. */
  seconds?: number;
  ratePerSecondKobo?: HawkKobo;
  /** Credit remaining, in seconds. Drives the hazard escalation. */
  remainingSeconds?: number;
  video?: boolean;
  children?: ReactNode;
  className?: string;
}

/** The full-screen call surface. */
export function HawkCallSurface({
  name,
  avatarUrl,
  state,
  seconds = 0,
  ratePerSecondKobo,
  remainingSeconds,
  video = false,
  children,
  className,
}: HawkCallSurfaceProps) {
  const active = state === HawkCallState.ACTIVE;
  const unstable = state === HawkCallState.RECONNECTING;

  return (
    <div
      className={cn(
        'flex min-h-full flex-col items-center justify-between bg-hawk-call-ground p-hawk-8',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-hawk-5 pt-hawk-9">
        <div className="relative">
          {/* The ring pulses only while waiting. Once connected it would be a
              decoration competing with the meter for attention. */}
          {(state === 'dialling' || state === 'ringing') && (
            <span className="hawk-motion absolute inset-0 animate-hawk-ring rounded-full bg-white/20" />
          )}
          <HawkAvatar name={name} src={avatarUrl} size="xl" />
        </div>

        <HawkText variant="title" ink="inverse">
          {name}
        </HawkText>

        <div className="flex items-center gap-hawk-3">
          {unstable && <HawkIcon icon={IconWifiOff} size={14} className="text-hawk-hazard" />}
          <HawkText
            variant="caption"
            ink={unstable ? undefined : 'inverse-muted'}
            className={cn(unstable && 'text-hawk-hazard')}
          >
            {STATE_LABEL[state]}
          </HawkText>
          {video && <HawkIcon icon={IconVideo} size={13} className="text-hawk-ink-inverse-muted" />}
        </div>

        {active && (
          <HawkMeter
            seconds={seconds}
            {...(ratePerSecondKobo !== undefined ? { ratePerSecondKobo } : {})}
            {...(remainingSeconds !== undefined ? { remainingSeconds } : {})}
            onDark
            className="mt-hawk-6"
          />
        )}
      </div>

      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkCallControlsProps {
  muted?: boolean;
  onToggleMute?: () => void;
  videoOff?: boolean;
  onToggleVideo?: () => void;
  speakerOn?: boolean;
  onToggleSpeaker?: () => void;
  onEnd?: () => void;
  /** Hide the video toggle on an audio-only call. */
  videoAvailable?: boolean;
  className?: string;
}

/**
 * The in-call control bar.
 *
 * End-call is visually distinct and physically separated from the toggles — it
 * is the one irreversible control here, and it must not sit in a row of
 * identical circles where a mis-tap ends a paid call.
 */
export function HawkCallControls({
  muted = false,
  onToggleMute,
  videoOff = false,
  onToggleVideo,
  speakerOn = false,
  onToggleSpeaker,
  onEnd,
  videoAvailable = false,
  className,
}: HawkCallControlsProps) {
  return (
    <div className={cn('flex flex-col items-center gap-hawk-8 pb-hawk-8', className)}>
      <div className="flex items-center gap-hawk-6">
        <HawkIconButton
          icon={muted ? IconMicOff : IconMic}
          label={muted ? 'Unmute' : 'Mute'}
          shape="circle"
          size="lg"
          variant="plain"
          onDark
          active={muted}
          onClick={onToggleMute}
        />
        {videoAvailable && (
          <HawkIconButton
            icon={videoOff ? IconVideoOff : IconVideo}
            label={videoOff ? 'Turn on camera' : 'Turn off camera'}
            shape="circle"
            size="lg"
            variant="plain"
            onDark
            active={videoOff}
            onClick={onToggleVideo}
          />
        )}
        <HawkIconButton
          icon={IconVolume}
          label={speakerOn ? 'Speaker off' : 'Speaker on'}
          shape="circle"
          size="lg"
          variant="plain"
          onDark
          active={speakerOn}
          onClick={onToggleSpeaker}
        />
      </div>

      <button
        type="button"
        onClick={onEnd}
        aria-label="End call"
        className="hawk-focusable flex h-16 w-16 items-center justify-center rounded-full bg-hawk-danger text-hawk-ink-inverse transition-transform active:scale-95"
      >
        <HawkIcon icon={IconPhoneOff} size={26} />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export const HawkNetworkQuality = {
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  LOST: 'lost',
} as const;
export type HawkNetworkQuality = (typeof HawkNetworkQuality)[keyof typeof HawkNetworkQuality];

/**
 * The connection indicator.
 *
 * `poor` is hazard, not critical: a degraded connection is a condition the
 * system reports, and the user cannot press it away. Only `lost` — where the
 * call is actually gone — reaches the critical register.
 */
export function HawkCallQuality({
  quality,
  onDark = true,
  className,
}: {
  quality: HawkNetworkQuality;
  onDark?: boolean;
  className?: string;
}) {
  const LABEL: Record<HawkNetworkQuality, string> = {
    good: 'Good connection',
    fair: 'Fair connection',
    poor: 'Poor connection',
    lost: 'Connection lost',
  };

  const tone =
    quality === 'poor'
      ? HAWK_HAZARD
      : quality === 'lost'
        ? quartet(HawkSemantic.CRITICAL)
        : quality === 'fair'
          ? quartet(HawkSemantic.CAUTION)
          : quartet(HawkSemantic.SUCCESS);

  return (
    <span className={cn('inline-flex items-center gap-hawk-2', className)}>
      <HawkIcon
        icon={
          quality === 'lost' ? IconWifiOff : quality === 'poor' ? IconChartWeak : IconNetworkQuality
        }
        size={13}
        className={tone.text}
      />
      <span
        className={cn(
          'text-hawk-caption font-medium',
          onDark ? 'text-hawk-ink-inverse-muted' : 'text-hawk-ink-muted',
        )}
      >
        {LABEL[quality]}
      </span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkPreConnectProps {
  name: string;
  avatarUrl?: string;
  ratePerMinuteKobo: HawkKobo;
  /** The user's spendable balance, in kobo. */
  balanceKobo: HawkKobo;
  /** Minutes the balance buys. */
  estimatedMinutes: number;
  onStart?: () => void;
  onCancel?: () => void;
  /** Blocks the start — a stale balance, no credit, offline. */
  blockedReason?: string;
  className?: string;
}

/**
 * The pre-connection surface — the last screen before money starts moving.
 *
 * Shows the rate, the balance and the minutes it buys, together, before the
 * call starts. This is the evidence rule (CONTRACTS §5.1) applied to the call:
 * a per-second product must never begin billing from a screen that did not say
 * what it costs.
 */
export function HawkPreConnect({
  name,
  avatarUrl,
  ratePerMinuteKobo,
  balanceKobo,
  estimatedMinutes,
  onStart,
  onCancel,
  blockedReason,
  className,
}: HawkPreConnectProps) {
  return (
    <div
      className={cn(
        'flex min-h-full flex-col items-center justify-between bg-hawk-call-ground p-hawk-8',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-hawk-5 pt-hawk-9">
        <HawkAvatar name={name} src={avatarUrl} size="xl" />
        <HawkText variant="title" ink="inverse">
          {name}
        </HawkText>
        <HawkText variant="caption" ink="inverse-muted">
          About to call
        </HawkText>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-hawk-5 rounded-hawk-fixed-lg bg-white/10 p-hawk-6">
        <div className="flex items-baseline justify-between">
          <HawkText variant="caption" ink="inverse-muted">
            Rate
          </HawkText>
          <span className="flex items-baseline gap-hawk-2">
            <HawkFigure value={ratePerMinuteKobo} size="sm" ink="inverse" neverMasked />
            <HawkText variant="caption" ink="inverse-muted">
              / min
            </HawkText>
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <HawkText variant="caption" ink="inverse-muted">
            Your balance
          </HawkText>
          <HawkFigure value={balanceKobo} size="sm" ink="inverse" />
        </div>
        <div className="flex items-baseline justify-between border-t border-white/15 pt-hawk-4">
          <HawkText variant="caption" ink="inverse-muted">
            Buys you about
          </HawkText>
          <HawkText variant="body" ink="inverse" record className="font-bold">
            {estimatedMinutes} min
          </HawkText>
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-hawk-4 pb-hawk-6">
        {blockedReason && (
          <div className="flex items-center justify-center gap-hawk-3 rounded-hawk-sm bg-hawk-hazard-soft px-hawk-5 py-hawk-4">
            <HawkIcon icon={IconAlertTriangle} size={14} className="text-hawk-hazard" />
            <HawkText variant="caption" className="text-hawk-hazard-on-soft">
              {blockedReason}
            </HawkText>
          </div>
        )}
        <HawkButton
          label="Start call"
          startIcon={IconPhone}
          size="lg"
          block
          disabled={Boolean(blockedReason)}
          onClick={onStart}
        />
        <HawkButton label="Cancel" variant="ghost" size="lg" block onDark onClick={onCancel} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkOutOfMinutesProps {
  /** Seconds left before the call is cut. */
  remainingSeconds: number;
  onTopUp?: () => void;
  onEnd?: () => void;
  className?: string;
}

/**
 * The out-of-minutes warning.
 *
 * Renders in the **hazard** family, not critical. The user did nothing wrong
 * and cannot press this away — it is the system reporting a condition, which is
 * exactly what CONTRACTS §0.2 reserves hazard for.
 */
export function HawkOutOfMinutes({
  remainingSeconds,
  onTopUp,
  onEnd,
  className,
}: HawkOutOfMinutesProps) {
  return (
    <div
      className={cn(
        'flex w-full max-w-sm flex-col items-center gap-hawk-5 rounded-hawk-fixed-lg',
        'border border-hawk-hazard-border bg-hawk-hazard-soft p-hawk-6 text-center',
        className,
      )}
    >
      <HawkIcon icon={IconAlertTriangle} size={22} className="text-hawk-hazard" />
      <HawkText variant="body" className="font-semibold text-hawk-hazard-on-soft">
        You are running out of minutes
      </HawkText>
      <HawkText variant="caption" className="text-hawk-hazard-on-soft">
        This call will end in {Math.max(0, Math.ceil(remainingSeconds / 60))} min unless you top up.
      </HawkText>
      <div className="flex w-full flex-col gap-hawk-3">
        <HawkButton label="Top up now" block onClick={onTopUp} />
        <HawkButton label="End call" variant="ghost" block onClick={onEnd} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkCallInviteProps {
  name: string;
  avatarUrl?: string;
  /** Who pays for the invited party's time. */
  payer?: string;
  video?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  className?: string;
}

/**
 * An incoming call / invite approval.
 *
 * Names the payer explicitly. In a multi-party call the inviter pays, and
 * someone accepting an invite is entitled to know before they answer whether
 * they are about to be billed.
 */
export function HawkCallInvite({
  name,
  avatarUrl,
  payer,
  video = false,
  onAccept,
  onDecline,
  className,
}: HawkCallInviteProps) {
  return (
    <div
      className={cn(
        'flex min-h-full flex-col items-center justify-between bg-hawk-call-ground p-hawk-8',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-hawk-5 pt-hawk-12">
        <div className="relative">
          <span className="hawk-motion absolute inset-0 animate-hawk-ring rounded-full bg-white/20" />
          <HawkAvatar name={name} src={avatarUrl} size="xl" />
        </div>
        <HawkText variant="title" ink="inverse">
          {name}
        </HawkText>
        <HawkText variant="caption" ink="inverse-muted">
          Incoming {video ? 'video' : 'audio'} call
        </HawkText>
        {payer && (
          <span className="rounded-hawk-pill bg-white/10 px-hawk-5 py-hawk-2">
            <HawkText variant="caption" ink="inverse-muted">
              {payer} is paying
            </HawkText>
          </span>
        )}
      </div>

      <div className="flex items-center gap-hawk-11 pb-hawk-9">
        <button
          type="button"
          onClick={onDecline}
          aria-label="Decline"
          className="hawk-focusable flex h-16 w-16 items-center justify-center rounded-full bg-hawk-danger text-hawk-ink-inverse transition-transform active:scale-95"
        >
          <HawkIcon icon={IconPhoneOff} size={26} />
        </button>
        <button
          type="button"
          onClick={onAccept}
          aria-label="Accept"
          className="hawk-focusable flex h-16 w-16 items-center justify-center rounded-full bg-hawk-success text-hawk-ink-inverse transition-transform active:scale-95"
        >
          <HawkIcon icon={IconPhone} size={26} />
        </button>
      </div>
    </div>
  );
}
