import type { ReactNode } from 'react';

import { HawkFigure } from '../foundation/figure.js';
import { HawkIcon } from '../foundation/icon.js';
import type { HawkKobo } from '../foundation/money.js';
import { HawkText } from '../foundation/text.js';
import { IconPhone, IconPlus, IconVideo } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { cn } from '../utils/cn.js';

import { HawkButton } from './button.js';

/**
 * The FAB.
 *
 * Circular, elevated, one per screen. `label` is required for the same reason
 * it is on the icon button — a floating glyph with no accessible name is a
 * mystery to anyone not looking at it.
 */
export interface HawkFabProps {
  icon?: HawkIconComponent;
  label: string;
  onClick?: () => void;
  /** Expands to show the label beside the glyph. */
  extended?: boolean;
  className?: string;
}

export function HawkFab({
  icon = IconPlus,
  label,
  onClick,
  extended = false,
  className,
}: HawkFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'hawk-focusable hawk-motion inline-flex items-center justify-center gap-hawk-4',
        'bg-hawk-acc text-hawk-acc-on shadow-hawk-popover',
        'transition-all duration-hawk-fast ease-hawk-standard hover:bg-hawk-acc-hover',
        'active:scale-[0.97]',
        extended ? 'h-14 rounded-hawk-pill px-hawk-7' : 'h-14 w-14 rounded-full',
        className,
      )}
    >
      <HawkIcon icon={icon} size={22} />
      {extended && <span className="text-hawk-body font-semibold">{label}</span>}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkContinueBarProps {
  label?: string;
  onContinue?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Secondary action shown beside — "Skip for now". */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Explanatory line above the action — e.g. why it is disabled. */
  hint?: ReactNode;
  className?: string;
}

/**
 * The continue bar — the pinned action on a multi-step flow.
 *
 * The `hint` slot exists because the alternative is worse: a disabled Continue
 * with no explanation is the single most common dead end in an onboarding
 * flow. If the button is off, the bar says why.
 */
export function HawkContinueBar({
  label = 'Continue',
  onContinue,
  disabled = false,
  loading = false,
  secondaryLabel,
  onSecondary,
  hint,
  className,
}: HawkContinueBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-hawk-sticky border-t border-hawk-line bg-hawk-paper p-hawk-pad',
        className,
      )}
    >
      {hint && (
        <div className="mb-hawk-4 text-center">
          <HawkText variant="caption" ink="muted">
            {hint}
          </HawkText>
        </div>
      )}
      <div className="flex items-center gap-hawk-4">
        {secondaryLabel && (
          <HawkButton
            label={secondaryLabel}
            variant="ghost"
            size="lg"
            onClick={onSecondary}
          />
        )}
        <HawkButton
          label={label}
          size="lg"
          block
          disabled={disabled}
          loading={loading}
          onClick={onContinue}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkTalkToCtaProps {
  name: string;
  /** Per-minute rate in kobo — what the user is about to commit to. */
  ratePerMinuteKobo: HawkKobo;
  onAudio?: () => void;
  onVideo?: () => void;
  /** Video is offered only when the professional supports it. */
  videoAvailable?: boolean;
  disabled?: boolean;
  /**
   * Why the action is unavailable.
   *
   * Never left blank when `disabled` — an inert "Talk to" button with no reason
   * is the offline-first failure the freshness contract exists to prevent.
   */
  unavailableReason?: string;
  className?: string;
}

/**
 * The talk-to CTA — the product's primary conversion action.
 *
 * Shows the price beside the action, always. A per-second billing product that
 * hides the rate behind a tap is asking the user to commit money blind, and the
 * evidence rule (CONTRACTS §5.1) is the same instinct applied to the Pass.
 */
export function HawkTalkToCta({
  name,
  ratePerMinuteKobo,
  onAudio,
  onVideo,
  videoAvailable = false,
  disabled = false,
  unavailableReason,
  className,
}: HawkTalkToCtaProps) {
  return (
    <div className={cn('flex flex-col gap-hawk-4', className)}>
      <div className="flex items-baseline justify-between gap-hawk-4">
        <HawkText variant="caption" ink="muted">
          Talk to {name}
        </HawkText>
        <div className="flex items-baseline gap-hawk-2">
          <HawkFigure value={ratePerMinuteKobo} size="sm" neverMasked />
          <HawkText variant="caption" ink="muted">
            / min
          </HawkText>
        </div>
      </div>

      <div className="flex items-center gap-hawk-4">
        <HawkButton
          label="Audio call"
          startIcon={IconPhone}
          size="lg"
          block
          disabled={disabled}
          onClick={onAudio}
        />
        {videoAvailable && (
          <HawkButton
            label="Video"
            startIcon={IconVideo}
            variant="outline"
            size="lg"
            disabled={disabled}
            onClick={onVideo}
          />
        )}
      </div>

      {disabled && unavailableReason && (
        <HawkText variant="caption" ink="muted" align="center">
          {unavailableReason}
        </HawkText>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkQuickRepliesProps {
  replies: readonly string[];
  onSelect: (reply: string) => void;
  disabled?: boolean;
  className?: string;
}

/** Suggested replies above a chat composer. */
export function HawkQuickReplies({
  replies,
  onSelect,
  disabled = false,
  className,
}: HawkQuickRepliesProps) {
  return (
    <div className={cn('flex flex-wrap gap-hawk-3', className)}>
      {replies.map((reply) => (
        <button
          key={reply}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(reply)}
          className={cn(
            'hawk-focusable hawk-motion rounded-hawk-pill border border-hawk-acc-border',
            'bg-hawk-paper px-hawk-5 py-hawk-3 text-hawk-label font-medium text-hawk-acc',
            'transition-colors duration-hawk-fast hover:bg-hawk-acc-soft active:scale-[0.97]',
            disabled && 'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
          )}
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
