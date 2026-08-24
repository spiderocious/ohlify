import type { ReactNode } from 'react';

import type { HawkBadgeSize } from '../contracts/size.js';
import { HawkIcon } from '../foundation/icon.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HAWK_HAZARD, HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

import type { HawkStatus } from './lifecycle.js';

/**
 * The badge — a status the system reports.
 *
 * Inert by construction: no `onClick`, no hover, no focus ring. The distinction
 * from `HawkChip` is deliberate and load-bearing — the pre-Hawk app used one
 * `AppTag` for both, so a status pill and a filter looked identical while one
 * was pressable and the other was not.
 */
export const HawkBadgeVariant = {
  /** Tinted background, `onSoft` text. The default. */
  SOFT: 'soft',
  /** Hairline border, `base` text, no fill. */
  OUTLINE: 'outline',
  /** Saturated fill — reserved for the one badge that must dominate. */
  SOLID: 'solid',
} as const;
export type HawkBadgeVariant =
  (typeof HawkBadgeVariant)[keyof typeof HawkBadgeVariant];

export interface HawkBadgeProps {
  label: ReactNode;
  semantic?: HawkSemantic;
  variant?: HawkBadgeVariant;
  size?: HawkBadgeSize;
  icon?: HawkIconComponent;
  /** A leading dot instead of an icon — the compact board treatment. */
  dot?: boolean;
  /**
   * Renders in the hazard family rather than a semantic.
   *
   * Hazard is a system alarm-state (CONTRACTS §0.2), escalating within the warm
   * family beyond `caution`. It is never a semantic value and never pressable.
   */
  hazard?: boolean;
  className?: string;
}

const SIZE: Record<HawkBadgeSize, string> = {
  sm: 'h-5 px-hawk-3 text-hawk-caption gap-hawk-2',
  md: 'h-6 px-hawk-4 text-hawk-label gap-hawk-3',
};

const GLYPH: Record<HawkBadgeSize, number> = { sm: 10, md: 12 };

export function HawkBadge({
  label,
  semantic = HawkSemantic.NEUTRAL,
  variant = HawkBadgeVariant.SOFT,
  size = 'sm',
  icon,
  dot = false,
  hazard = false,
  className,
}: HawkBadgeProps) {
  const tone = hazard ? HAWK_HAZARD : quartet(semantic);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-hawk-pill font-semibold',
        SIZE[size],
        variant === 'solid'
          ? cn(tone.solidBg, 'text-hawk-ink-inverse')
          : variant === 'outline'
            ? cn('border bg-transparent', tone.border, tone.text)
            : cn(tone.softBg, tone.onSoft),
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            variant === 'solid' ? 'bg-current' : tone.solidBg,
          )}
        />
      )}
      {icon && !dot && <HawkIcon icon={icon} size={GLYPH[size]} />}
      <span className="truncate">{label}</span>
    </span>
  );
}

/**
 * A badge built from a lifecycle status.
 *
 * The single call site for turning a backend enum value into a pill: the label
 * and the tone both come from the registry, so no screen can decide for itself
 * what "pending" looks like.
 */
export function HawkStatusBadge({
  status,
  variant,
  size,
  dot = true,
  className,
}: {
  status: HawkStatus;
  variant?: HawkBadgeVariant;
  size?: HawkBadgeSize;
  dot?: boolean;
  className?: string;
}) {
  return (
    <HawkBadge
      label={status.label}
      semantic={status.semantic}
      variant={variant}
      size={size}
      dot={dot}
      className={className}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkTagProps {
  label: ReactNode;
  icon?: HawkIconComponent;
  /** Renders in the accent family — a category, an interest. */
  accent?: boolean;
  size?: HawkBadgeSize;
  className?: string;
}

/**
 * A tag — a label with no state.
 *
 * Distinct from a badge because it carries *no tone*: an interest ("Tax law")
 * is not success or caution, and forcing it through the semantic enum would
 * mean picking a colour that implies something about content it knows nothing
 * about.
 */
export function HawkTag({
  label,
  icon,
  accent = false,
  size = 'sm',
  className,
}: HawkTagProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-hawk-sm font-medium',
        SIZE[size],
        accent ? 'bg-hawk-acc-soft text-hawk-acc-on-soft' : 'bg-hawk-sunken text-hawk-ink-muted',
        className,
      )}
    >
      {icon && <HawkIcon icon={icon} size={GLYPH[size]} />}
      <span className="truncate">{label}</span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkDotProps {
  semantic?: HawkSemantic;
  /** Adds the pulsing halo — live, in-progress states only. */
  pulse?: boolean;
  size?: number;
  label?: string;
  className?: string;
}

/** A bare status dot — presence, connection, a row's live marker. */
export function HawkDot({
  semantic = HawkSemantic.NEUTRAL,
  pulse = false,
  size = 8,
  label,
  className,
}: HawkDotProps) {
  const tone = quartet(semantic);
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {pulse && (
        <span
          className={cn('hawk-motion absolute inset-0 animate-hawk-ring rounded-full', tone.solidBg)}
        />
      )}
      <span className={cn('relative inline-block h-full w-full rounded-full', tone.solidBg)} />
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkCountBadgeProps {
  count: number;
  /** Beyond this, renders "99+". */
  max?: number;
  semantic?: HawkSemantic;
  className?: string;
}

/**
 * A numeric badge — unread counts on a nav item.
 *
 * Renders nothing at zero. A "0" badge is visual noise claiming attention for
 * the absence of anything.
 */
export function HawkCountBadge({
  count,
  max = 99,
  semantic = HawkSemantic.CRITICAL,
  className,
}: HawkCountBadgeProps) {
  if (count <= 0) return null;
  const tone = quartet(semantic);

  return (
    <span
      aria-label={`${count} unread`}
      className={cn(
        'hawk-record inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center',
        'rounded-full px-1 text-hawk-tiny font-bold tabular-nums text-hawk-ink-inverse',
        tone.solidBg,
        className,
      )}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export const HawkPresence = {
  ONLINE: 'online',
  BUSY: 'busy',
  AWAY: 'away',
  OFFLINE: 'offline',
} as const;
export type HawkPresence = (typeof HawkPresence)[keyof typeof HawkPresence];

const PRESENCE_TONE: Record<HawkPresence, HawkSemantic> = {
  online: HawkSemantic.SUCCESS,
  busy: HawkSemantic.CAUTION,
  away: HawkSemantic.NEUTRAL,
  offline: HawkSemantic.NEUTRAL,
};

const PRESENCE_LABEL: Record<HawkPresence, string> = {
  online: 'Online',
  busy: 'On a call',
  away: 'Away',
  offline: 'Offline',
};

/**
 * Presence indicator.
 *
 * `busy` says "On a call" rather than "Busy" — in a marketplace that sells
 * calls, the specific reason is the useful one, and it tells a waiting client
 * that this professional is working rather than absent.
 */
export function HawkPresenceIndicator({
  presence,
  withLabel = false,
  size = 8,
  className,
}: {
  presence: HawkPresence;
  withLabel?: boolean;
  size?: number;
  className?: string;
}) {
  const label = PRESENCE_LABEL[presence];

  if (!withLabel) {
    return (
      <HawkDot
        semantic={PRESENCE_TONE[presence]}
        pulse={presence === 'online'}
        size={size}
        label={label}
        className={cn(
          // Offline reads as an outline rather than a fill: an absent person
          // should not carry the same visual weight as a present one.
          presence === 'offline' && 'opacity-40',
          className,
        )}
      />
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-hawk-3', className)}>
      <HawkDot
        semantic={PRESENCE_TONE[presence]}
        pulse={presence === 'online'}
        size={size}
        className={cn(presence === 'offline' && 'opacity-40')}
      />
      <span className="text-hawk-caption font-medium text-hawk-ink-muted">{label}</span>
    </span>
  );
}
