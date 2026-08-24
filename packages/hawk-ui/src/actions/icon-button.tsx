import type { HawkIconButtonSize } from '../contracts/size.js';
import { HAWK_ICON_BUTTON_GLYPH_PX, HAWK_ICON_BUTTON_PX } from '../contracts/size.js';
import { HawkIcon } from '../foundation/icon.js';
import type { HawkIconComponent } from '../icons/index.js';
import { cn } from '../utils/cn.js';

import { HawkButtonVariant, HawkSpinner } from './button.js';

/**
 * The icon button.
 *
 * A separate component rather than a `HawkButton` prop, because it needs its own
 * size scale (CONTRACTS §7: `xs|sm|md|lg`, one step finer than Button's
 * `sm|md|lg` — a bare glyph reads smaller than a glyph beside a word) and
 * because it is square by construction.
 *
 * `label` is **required**. A button whose entire content is a glyph is
 * unlabelled to a screen reader, and making the accessible name optional is how
 * an icon-only toolbar ships as a row of "button, button, button".
 */
export const HawkIconButtonShape = {
  SQUARE: 'square',
  CIRCLE: 'circle',
} as const;
export type HawkIconButtonShape = (typeof HawkIconButtonShape)[keyof typeof HawkIconButtonShape];

export interface HawkIconButtonProps {
  icon: HawkIconComponent;
  /** Accessible name. Required — see above. */
  label: string;
  onClick?: () => void;
  variant?: HawkButtonVariant;
  size?: HawkIconButtonSize;
  shape?: HawkIconButtonShape;
  destructive?: boolean;
  onDark?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Renders the pressed/active treatment — for toggles like mute. */
  active?: boolean;
  className?: string;
}

function variantClass(
  variant: HawkButtonVariant,
  destructive: boolean,
  onDark: boolean,
  active: boolean,
): string {
  if (onDark) {
    if (active) return 'bg-hawk-ink-inverse text-hawk-ink-strong';
    switch (variant) {
      case 'solid':
        return 'bg-hawk-ink-inverse text-hawk-ink-strong hover:bg-white/90';
      case 'outline':
        return 'border border-white/40 text-hawk-ink-inverse hover:bg-white/10';
      case 'plain':
        return 'bg-white/15 text-hawk-ink-inverse hover:bg-white/25';
      case 'ghost':
        return 'text-hawk-ink-inverse hover:bg-white/10';
    }
  }

  if (destructive) {
    switch (variant) {
      case 'solid':
        return 'bg-hawk-danger text-hawk-acc-on hover:bg-hawk-danger-hover';
      case 'outline':
        return 'border border-hawk-danger-border text-hawk-danger hover:bg-hawk-danger-soft';
      case 'plain':
        return 'bg-hawk-danger-soft text-hawk-danger-on-soft hover:brightness-95';
      case 'ghost':
        return 'text-hawk-danger hover:bg-hawk-danger-soft';
    }
  }

  if (active) return 'bg-hawk-acc text-hawk-acc-on';

  switch (variant) {
    case 'solid':
      return 'bg-hawk-acc text-hawk-acc-on hover:bg-hawk-acc-hover';
    case 'outline':
      return 'border border-hawk-line text-hawk-ink hover:bg-hawk-sunken';
    case 'plain':
      return 'bg-hawk-sunken text-hawk-ink hover:bg-hawk-acc-soft';
    case 'ghost':
      return 'text-hawk-ink-muted hover:bg-hawk-sunken hover:text-hawk-ink';
  }
}

export function HawkIconButton({
  icon,
  label,
  onClick,
  variant = HawkButtonVariant.GHOST,
  size = 'md',
  shape = HawkIconButtonShape.SQUARE,
  destructive = false,
  onDark = false,
  disabled = false,
  loading = false,
  active = false,
  className,
}: HawkIconButtonProps) {
  const inert = disabled || loading;
  const edge = HAWK_ICON_BUTTON_PX[size];
  const glyph = HAWK_ICON_BUTTON_GLYPH_PX[size];

  return (
    <button
      type="button"
      disabled={inert}
      aria-label={label}
      aria-pressed={active || undefined}
      aria-busy={loading || undefined}
      title={label}
      onClick={inert ? undefined : onClick}
      style={{ width: edge, height: edge }}
      className={cn(
        'hawk-focusable hawk-motion inline-flex shrink-0 items-center justify-center',
        'transition-colors duration-hawk-fast ease-hawk-standard active:scale-[0.97]',
        shape === 'circle' ? 'rounded-full' : 'rounded-hawk-sm',
        variantClass(variant, destructive, onDark, active),
        inert && 'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
        className,
      )}
    >
      {loading ? <HawkSpinner size={glyph} /> : <HawkIcon icon={icon} size={glyph} />}
    </button>
  );
}
