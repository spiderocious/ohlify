import type { ElementType, ReactNode } from 'react';

import { cn } from '../utils/cn.js';

/**
 * The ink ladder. Four steps plus an inverse pair.
 *
 * Replaces the twelve improvised text colours the pre-Hawk audit found — five
 * of which were greys sitting inside a 25% lightness band, doing the same job
 * while looking almost, but not quite, alike.
 */
export const HawkInk = {
  STRONG: 'strong',
  DEFAULT: 'default',
  MUTED: 'muted',
  DISABLED: 'disabled',
  INVERSE: 'inverse',
  INVERSE_MUTED: 'inverse-muted',
  ACCENT: 'accent',
} as const;
export type HawkInk = (typeof HawkInk)[keyof typeof HawkInk];

export const HAWK_INK_CLASS: Record<HawkInk, string> = {
  strong: 'text-hawk-ink-strong',
  default: 'text-hawk-ink',
  muted: 'text-hawk-ink-muted',
  disabled: 'text-hawk-ink-disabled',
  inverse: 'text-hawk-ink-inverse',
  'inverse-muted': 'text-hawk-ink-inverse-muted',
  accent: 'text-hawk-acc',
};

/**
 * The type scale.
 *
 * The `display*` tier is new: the pre-Hawk app topped out at 24px, so a wallet
 * balance — the single most important figure on its screen — had no slot and
 * was rendered at the same size as a section heading.
 */
export const HawkTextVariant = {
  DISPLAY_XL: 'display-xl',
  DISPLAY_LG: 'display-lg',
  DISPLAY: 'display',
  TITLE: 'title',
  HEADER: 'header',
  BODY_TITLE: 'body-title',
  MEDIUM: 'medium',
  SUBHEADER: 'subheader',
  BODY: 'body',
  LABEL: 'label',
  CAPTION: 'caption',
  OVERLINE: 'overline',
  TINY: 'tiny',
} as const;
export type HawkTextVariant = (typeof HawkTextVariant)[keyof typeof HawkTextVariant];

const VARIANT_CLASS: Record<HawkTextVariant, string> = {
  'display-xl': 'text-hawk-display-xl font-black tracking-hawk-display',
  'display-lg': 'text-hawk-display-lg font-black tracking-hawk-display',
  display: 'text-hawk-display font-extrabold tracking-hawk-display',
  title: 'text-hawk-title font-semibold tracking-hawk-tight',
  header: 'text-hawk-header font-semibold tracking-hawk-tight',
  'body-title': 'text-hawk-body-title font-medium',
  medium: 'text-hawk-medium font-semibold',
  subheader: 'text-hawk-subheader font-normal',
  body: 'text-hawk-body font-normal',
  label: 'text-hawk-label font-medium tracking-hawk-label',
  caption: 'text-hawk-caption font-medium',
  overline: 'text-hawk-overline font-bold uppercase tracking-hawk-overline',
  tiny: 'text-hawk-tiny font-normal',
};

export interface HawkTextProps {
  children: ReactNode;
  variant?: HawkTextVariant;
  ink?: HawkInk;
  /** Polymorphism is opt-in. CONTRACTS §8 — Text genuinely varies. */
  as?: ElementType;
  className?: string;
  /** Clamp to N lines with an ellipsis. */
  clamp?: 1 | 2 | 3;
  align?: 'left' | 'center' | 'right';
  /** Render with tabular figures — for anything that must not jitter. */
  record?: boolean;
  title?: string;
  id?: string;
}

const CLAMP: Record<1 | 2 | 3, string> = {
  1: 'truncate',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
};

const ALIGN = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

/** The general text primitive. */
export function HawkText({
  children,
  variant = HawkTextVariant.BODY,
  ink = HawkInk.DEFAULT,
  as: Tag = 'span',
  className,
  clamp,
  align,
  record = false,
  title,
  id,
}: HawkTextProps) {
  return (
    <Tag
      id={id}
      title={title}
      className={cn(
        VARIANT_CLASS[variant],
        HAWK_INK_CLASS[ink],
        clamp && CLAMP[clamp],
        align && ALIGN[align],
        record && 'hawk-record',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export interface HawkHeadingProps extends Omit<HawkTextProps, 'as' | 'variant'> {
  /** Maps to `h1`–`h6`. CONTRACTS §8. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: HawkTextVariant;
}

const LEVEL_VARIANT: Record<1 | 2 | 3 | 4 | 5 | 6, HawkTextVariant> = {
  1: HawkTextVariant.DISPLAY,
  2: HawkTextVariant.TITLE,
  3: HawkTextVariant.HEADER,
  4: HawkTextVariant.BODY_TITLE,
  5: HawkTextVariant.MEDIUM,
  6: HawkTextVariant.SUBHEADER,
};

/**
 * A heading.
 *
 * `level` drives the element (`h1`–`h6`) and the default size independently, so
 * a page can keep a correct document outline without being forced into a
 * visual size it does not want — `<HawkHeading level={2} variant="medium">` is
 * a legitimate combination, and the alternative is feature code reaching for a
 * raw `<h2>` to escape the coupling.
 */
export function HawkHeading({
  level = 2,
  variant,
  ink = HawkInk.STRONG,
  ...rest
}: HawkHeadingProps) {
  const Tag = `h${level}` as ElementType;
  return <HawkText as={Tag} variant={variant ?? LEVEL_VARIANT[level]} ink={ink} {...rest} />;
}

export type HawkCaptionProps = Omit<HawkTextProps, 'variant'>;

/** The small, quiet register — timestamps, helper text, row subtitles. */
export function HawkCaption({ ink = HawkInk.MUTED, ...rest }: HawkCaptionProps) {
  return <HawkText variant={HawkTextVariant.CAPTION} ink={ink} {...rest} />;
}

/** The all-caps micro-label above a group. */
export function HawkOverline({ ink = HawkInk.MUTED, ...rest }: HawkCaptionProps) {
  return <HawkText variant={HawkTextVariant.OVERLINE} ink={ink} {...rest} />;
}
