import type { ReactNode } from 'react';

import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import { IconAlertTriangle, IconCheck, IconClose, IconInfo } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HAWK_HAZARD, HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

/**
 * The default glyph per semantic.
 *
 * A callout without an icon relies on colour alone to carry its tone, which
 * fails for roughly one man in twelve. The glyph is the redundant channel.
 */
const SEMANTIC_ICON: Record<HawkSemantic, HawkIconComponent> = {
  neutral: IconInfo,
  info: IconInfo,
  success: IconCheck,
  caution: IconAlertTriangle,
  critical: IconAlertTriangle,
};

export interface HawkCalloutProps {
  message: ReactNode;
  title?: ReactNode;
  semantic?: HawkSemantic;
  /** System alarm-state. CONTRACTS §0.2 — never pressable. */
  hazard?: boolean;
  icon?: HawkIconComponent;
  /** An inline action — "Verify now". */
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

/**
 * A callout — an inline message attached to the content around it.
 *
 * Uses the quartet: `soft` background, `onSoft` text, `base` icon. Never a
 * palette of its own — CONTRACTS §1.1.
 */
export function HawkCallout({
  message,
  title,
  semantic = HawkSemantic.INFO,
  hazard = false,
  icon,
  action,
  onDismiss,
  className,
}: HawkCalloutProps) {
  const tone = hazard ? HAWK_HAZARD : quartet(semantic);
  const glyph = icon ?? (hazard ? IconAlertTriangle : SEMANTIC_ICON[semantic]);

  return (
    <div
      role={semantic === 'critical' || hazard ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-hawk-4 rounded-hawk-sm border p-hawk-5',
        tone.softBg,
        tone.border,
        className,
      )}
    >
      <HawkIcon icon={glyph} size={16} className={cn('mt-0.5', tone.text)} />

      <div className="flex min-w-0 flex-1 flex-col gap-hawk-2">
        {title && (
          <HawkText variant="label" className={cn('font-semibold', tone.onSoft)}>
            {title}
          </HawkText>
        )}
        <div className={cn('text-hawk-label', tone.onSoft)}>{message}</div>
        {action && <div className="mt-hawk-2">{action}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn('hawk-focusable shrink-0 rounded-hawk-xs p-0.5', tone.onSoft)}
        >
          <HawkIcon icon={IconClose} size={14} />
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkBannerProps {
  message: ReactNode;
  title?: ReactNode;
  semantic?: HawkSemantic;
  hazard?: boolean;
  icon?: HawkIconComponent;
  action?: ReactNode;
  onDismiss?: () => void;
  /** Pinned to the top of the viewport. */
  sticky?: boolean;
  className?: string;
}

/**
 * A banner — a message about the whole screen or session.
 *
 * Full-bleed and square-cornered, which is what distinguishes it from a
 * callout: a banner belongs to the app chrome, a callout belongs to the content
 * it sits beside. The revamp decisions were explicit that these are
 * **banners, not popups** — an interruption the user can read past beats one
 * they must dismiss before continuing.
 */
export function HawkBanner({
  message,
  title,
  semantic = HawkSemantic.INFO,
  hazard = false,
  icon,
  action,
  onDismiss,
  sticky = false,
  className,
}: HawkBannerProps) {
  const tone = hazard ? HAWK_HAZARD : quartet(semantic);
  const glyph = icon ?? (hazard ? IconAlertTriangle : SEMANTIC_ICON[semantic]);

  return (
    <div
      role={semantic === 'critical' || hazard ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-hawk-4 border-b px-hawk-pad py-hawk-4',
        tone.softBg,
        tone.border,
        sticky && 'sticky top-0 z-hawk-sticky',
        className,
      )}
    >
      <HawkIcon icon={glyph} size={16} className={cn('shrink-0', tone.text)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {title && <span className={cn('text-hawk-label font-semibold', tone.onSoft)}>{title}</span>}
        <span className={cn('truncate text-hawk-label', tone.onSoft)}>{message}</span>
      </div>

      {action}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn('hawk-focusable shrink-0 rounded-hawk-xs p-0.5', tone.onSoft)}
        >
          <HawkIcon icon={IconClose} size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * The offline / stale banner.
 *
 * A named shape rather than a `HawkBanner` with the right props, because it is
 * the visible half of the freshness contract (CONTRACTS §10) and it should not
 * be possible to render it with the wrong tone. Caution, never critical: being
 * offline is a condition, not a failure.
 */
export function HawkFreshnessBanner({
  ageLabel,
  onRefresh,
  offline = false,
  className,
}: {
  ageLabel?: string;
  onRefresh?: () => void;
  offline?: boolean;
  className?: string;
}) {
  return (
    <HawkBanner
      semantic={HawkSemantic.CAUTION}
      message={
        offline
          ? `You are offline${ageLabel ? ` · showing data from ${ageLabel}` : ''}`
          : `Showing saved data${ageLabel ? ` · last refreshed ${ageLabel}` : ''}`
      }
      action={
        onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="hawk-focusable shrink-0 rounded-hawk-xs text-hawk-caption font-semibold text-hawk-caution-on-soft hover:underline"
          >
            Refresh
          </button>
        )
      }
      className={className}
    />
  );
}
