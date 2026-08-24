import type { ElementType, ReactNode } from 'react';

import type { HawkButtonSize } from '../contracts/size.js';
import { HawkIcon } from '../foundation/icon.js';
import type { HawkIconComponent } from '../icons/index.js';
import { cn } from '../utils/cn.js';

/**
 * The button family. CONTRACTS §3.
 *
 * The public surface is three **independent axes**, never a flat cross-product:
 *
 *     variant:     solid | outline | plain | ghost
 *     destructive: boolean
 *     onDark:      boolean
 *     size:        sm | md | lg
 *
 * There is no `solid-destructive-on-dark` enum member; the class resolves
 * internally from the three.
 *
 * **Two deliberate absences.**
 *
 * The pre-Hawk button accepted `radius`, `height`, `padding`, `textStyle` and
 * `borderColor`. All five are gone: a button that accepts a `textStyle` has
 * given up on being a design system. Size and register decide geometry.
 *
 * There is no `hazard` variant either (CONTRACTS §0.2). Hazard is a state the
 * system *reports*; a user cannot press one. Irreversible operator actions use
 * `destructive`, which is colder and deliberately distinct.
 */
export const HawkButtonVariant = {
  SOLID: 'solid',
  OUTLINE: 'outline',
  PLAIN: 'plain',
  GHOST: 'ghost',
} as const;
export type HawkButtonVariant =
  (typeof HawkButtonVariant)[keyof typeof HawkButtonVariant];

const SIZE_CLASS: Record<HawkButtonSize, string> = {
  // Heights come from the register: `md` is 48px in PASS, 34px in BOARD.
  sm: 'h-hawk-sm px-hawk-5 text-hawk-label gap-hawk-3',
  md: 'h-hawk-md px-hawk-6 text-hawk-body gap-hawk-4',
  lg: 'h-hawk-lg px-hawk-7 text-hawk-subheader gap-hawk-4',
};

const GLYPH_PX: Record<HawkButtonSize, number> = { sm: 14, md: 16, lg: 18 };

function variantClass(
  variant: HawkButtonVariant,
  destructive: boolean,
  onDark: boolean,
): string {
  if (onDark) {
    // On a dark surface the whole ladder inverts: the call screen and the
    // violet hero card both need a button that reads against them, and tinting
    // the light-surface classes down never produces a legible result.
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

  switch (variant) {
    case 'solid':
      return 'bg-hawk-acc text-hawk-acc-on hover:bg-hawk-acc-hover active:bg-hawk-acc-pressed';
    case 'outline':
      return 'border border-hawk-acc-border text-hawk-acc hover:bg-hawk-acc-soft';
    case 'plain':
      return 'bg-hawk-acc-soft text-hawk-acc-on-soft hover:bg-hawk-acc-soft-hover';
    case 'ghost':
      return 'text-hawk-acc hover:bg-hawk-acc-soft';
  }
}

export interface HawkButtonProps {
  label?: string;
  children?: ReactNode;
  onClick?: () => void;
  variant?: HawkButtonVariant;
  size?: HawkButtonSize;
  /** Irreversible action. Independent of variant. */
  destructive?: boolean;
  /** Sitting on a dark surface — the call screen, the violet hero. */
  onDark?: boolean;
  disabled?: boolean;
  loading?: boolean;
  startIcon?: HawkIconComponent;
  endIcon?: HawkIconComponent;
  /** Fill the available width. */
  block?: boolean;
  /** Pill geometry — the chip-shaped call to action. */
  pill?: boolean;
  /** Polymorphism is opt-in. CONTRACTS §8 — Button genuinely varies to `a`. */
  as?: ElementType;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  'aria-label'?: string;
}

export function HawkButton({
  label,
  children,
  onClick,
  variant = HawkButtonVariant.SOLID,
  size = 'md',
  destructive = false,
  onDark = false,
  disabled = false,
  loading = false,
  startIcon,
  endIcon,
  block = false,
  pill = false,
  as,
  href,
  type = 'button',
  className,
  'aria-label': ariaLabel,
}: HawkButtonProps) {
  // A loading button is inert: the action is already in flight, and a second
  // press would submit it twice.
  const inert = disabled || loading;
  const Tag: ElementType = as ?? (href ? 'a' : 'button');
  const glyph = GLYPH_PX[size];

  return (
    <Tag
      type={Tag === 'button' ? type : undefined}
      href={href}
      disabled={Tag === 'button' ? inert : undefined}
      aria-disabled={Tag === 'button' ? undefined : inert}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      onClick={inert ? undefined : onClick}
      className={cn(
        'hawk-focusable hawk-motion inline-flex select-none items-center justify-center',
        'font-semibold transition-colors duration-hawk-fast ease-hawk-standard',
        'active:scale-[0.97] active:duration-hawk-instant',
        pill ? 'rounded-hawk-pill' : 'rounded-hawk-sm',
        SIZE_CLASS[size],
        variantClass(variant, destructive, onDark),
        block ? 'w-full' : 'w-fit',
        inert && 'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
        className,
      )}
    >
      {loading ? (
        <HawkSpinner size={glyph} />
      ) : (
        startIcon && <HawkIcon icon={startIcon} size={glyph} />
      )}
      {(label ?? children) !== undefined && <span>{label ?? children}</span>}
      {endIcon && !loading && <HawkIcon icon={endIcon} size={glyph} />}
    </Tag>
  );
}

/**
 * The in-button spinner.
 *
 * Replaces the label's leading glyph rather than the label itself: a button
 * that loses its text mid-press leaves the user unsure what they pressed.
 */
export function HawkSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'hawk-motion inline-block animate-hawk-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
