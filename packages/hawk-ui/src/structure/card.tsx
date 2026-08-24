import type { ReactNode } from 'react';

import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import { IconChevronDown, IconChevronRight, IconLock } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { cn } from '../utils/cn.js';
import { useState } from 'react';

/**
 * The card family.
 *
 * `flat` is the default rather than `elevated`. The system is hairline-first:
 * shadow is reserved for things that genuinely float above the page (popovers,
 * modals, toasts). A page of shadowed cards makes nothing look raised, because
 * everything is.
 */
export const HawkCardVariant = {
  /** Hairline border on paper. The default. */
  FLAT: 'flat',
  /** No border — sits on the tinted stock instead. */
  SUNKEN: 'sunken',
  /** Shadowed. For genuinely floating content only. */
  RAISED: 'raised',
  /** The violet hero — the wallet balance card. */
  HERO: 'hero',
} as const;
export type HawkCardVariant = (typeof HawkCardVariant)[keyof typeof HawkCardVariant];

const VARIANT: Record<HawkCardVariant, string> = {
  flat: 'border border-hawk-line bg-hawk-paper',
  sunken: 'bg-hawk-stock',
  raised: 'border border-hawk-line bg-hawk-paper shadow-hawk-popover',
  hero: 'bg-hawk-hero text-hawk-hero-on',
};

export interface HawkCardProps {
  children: ReactNode;
  variant?: HawkCardVariant;
  /** Remove the internal padding — for a card whose child owns its own edges. */
  flush?: boolean;
  onClick?: () => void;
  as?: 'div' | 'article' | 'section' | 'a';
  href?: string;
  className?: string;
}

export function HawkCard({
  children,
  variant = HawkCardVariant.FLAT,
  flush = false,
  onClick,
  as: Tag = 'div',
  href,
  className,
}: HawkCardProps) {
  const interactive = Boolean(onClick || href);

  return (
    <Tag
      href={href}
      onClick={onClick}
      className={cn(
        'rounded-hawk',
        VARIANT[variant],
        !flush && 'p-hawk-pad',
        interactive &&
          'hawk-motion cursor-pointer transition-shadow duration-hawk-fast hover:shadow-hawk-popover',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkSectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-side action — "See all", a filter, a button. */
  action?: ReactNode;
  /** Renders in the quiet overline register rather than as a heading. */
  overline?: boolean;
  className?: string;
}

export function HawkSectionHeader({
  title,
  subtitle,
  action,
  overline = false,
  className,
}: HawkSectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-hawk-5', className)}>
      <div className="flex min-w-0 flex-col gap-hawk-1">
        {overline ? (
          <HawkText variant="overline" ink="muted">
            {title}
          </HawkText>
        ) : (
          <HawkText variant="medium" ink="strong" as="h3">
            {title}
          </HawkText>
        )}
        {subtitle && (
          <HawkText variant="caption" ink="muted">
            {subtitle}
          </HawkText>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkListProps {
  children: ReactNode;
  /** Wrap in a bordered card. */
  carded?: boolean;
  /** Hairlines between rows. */
  divided?: boolean;
  className?: string;
}

/** A vertical list of rows, optionally carded and hairline-divided. */
export function HawkList({
  children,
  carded = true,
  divided = true,
  className,
}: HawkListProps) {
  return (
    <div
      className={cn(
        'flex flex-col',
        carded && 'overflow-hidden rounded-hawk border border-hawk-line bg-hawk-paper',
        divided && '[&>*+*]:border-t [&>*+*]:border-hawk-line',
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface HawkTileProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  icon?: HawkIconComponent;
  onClick?: () => void;
  /** Show the navigation chevron. */
  chevron?: boolean;
  className?: string;
}

/** A single list row. */
export function HawkTile({
  title,
  subtitle,
  leading,
  trailing,
  icon,
  onClick,
  chevron = false,
  className,
}: HawkTileProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-hawk-5 px-hawk-pad py-hawk-row-y text-left',
        onClick && 'hawk-focusable transition-colors duration-hawk-fast hover:bg-hawk-hovered',
        className,
      )}
    >
      {icon && (
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-hawk-sm bg-hawk-sunken text-hawk-ink-muted">
          <HawkIcon icon={icon} size={17} />
        </span>
      )}
      {leading}
      <span className="flex min-w-0 flex-1 flex-col">
        <HawkText variant="body" ink="strong" clamp={1}>
          {title}
        </HawkText>
        {subtitle && (
          <HawkText variant="caption" ink="muted" clamp={1}>
            {subtitle}
          </HawkText>
        )}
      </span>
      {trailing}
      {chevron && (
        <HawkIcon icon={IconChevronRight} size={16} className="text-hawk-ink-disabled" />
      )}
    </Tag>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkAccordionProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Controlled mode. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  subtitle?: ReactNode;
  className?: string;
}

export function HawkAccordion({
  title,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  subtitle,
  className,
}: HawkAccordionProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const isOpen = open ?? uncontrolled;

  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };

  return (
    <div className={cn('border-b border-hawk-line', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="hawk-focusable flex w-full items-center gap-hawk-4 py-hawk-5 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <HawkText variant="body" ink="strong">
            {title}
          </HawkText>
          {subtitle && (
            <HawkText variant="caption" ink="muted">
              {subtitle}
            </HawkText>
          )}
        </span>
        <HawkIcon
          icon={IconChevronDown}
          size={16}
          className={cn(
            'hawk-motion shrink-0 text-hawk-ink-muted transition-transform duration-hawk-fast',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {isOpen && <div className="pb-hawk-5 text-hawk-body text-hawk-ink">{children}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkContentBlockProps {
  children: ReactNode;
  className?: string;
}

/**
 * A long-form prose block — legal copy, FAQ answers.
 *
 * The one place the system relaxes its type rules: prose needs a comfortable
 * measure and generous leading, which the component scale deliberately does not
 * provide because every other surface in the product is dense.
 */
export function HawkContentBlock({ children, className }: HawkContentBlockProps) {
  return (
    <div
      className={cn(
        'max-w-prose text-hawk-body leading-relaxed text-hawk-ink',
        '[&_a]:text-hawk-acc [&_a]:underline [&_a]:underline-offset-2',
        '[&_h2]:mb-hawk-4 [&_h2]:mt-hawk-8 [&_h2]:text-hawk-medium [&_h2]:font-semibold [&_h2]:text-hawk-ink-strong',
        '[&_h3]:mb-hawk-3 [&_h3]:mt-hawk-6 [&_h3]:text-hawk-subheader [&_h3]:font-semibold [&_h3]:text-hawk-ink-strong',
        '[&_li]:mb-hawk-2',
        '[&_ol]:list-decimal [&_ol]:pl-hawk-7 [&_ul]:list-disc [&_ul]:pl-hawk-7',
        '[&_p]:mb-hawk-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkLockedProps {
  children: ReactNode;
  locked?: boolean;
  /** Why it is locked, and what would unlock it. */
  reason?: ReactNode;
  /** The action that unlocks — "Verify your identity". */
  action?: ReactNode;
  className?: string;
}

/**
 * The locked state — one cross-cutting wrapper, not 88 variants.
 *
 * Any surface can be locked: a rate editor before KYC, a withdrawal before a
 * bank account exists, a call before a balance top-up. Rather than each of
 * those growing a `locked` prop and its own treatment, they wrap.
 *
 * The content stays visible beneath the hatch. Hiding it entirely would leave
 * the user unable to see what they are being offered, which is exactly the
 * information that motivates them to unlock it.
 */
export function HawkLocked({
  children,
  locked = true,
  reason,
  action,
  className,
}: HawkLockedProps) {
  if (!locked) return <>{children}</>;

  return (
    <div className={cn('relative overflow-hidden rounded-hawk', className)}>
      <div aria-hidden="true" className="pointer-events-none select-none opacity-45 blur-[1px]">
        {children}
      </div>

      <div className="hawk-hatch absolute inset-0" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-hawk-4 p-hawk-6 text-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-hawk-paper shadow-hawk-popover">
          <HawkIcon icon={IconLock} size={18} className="text-hawk-ink-muted" />
        </span>
        {reason && (
          <HawkText variant="caption" ink="muted" className="max-w-xs">
            {reason}
          </HawkText>
        )}
        {action}
      </div>
    </div>
  );
}
