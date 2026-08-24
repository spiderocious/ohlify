import type { ElementType, ReactNode } from 'react';

import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import { IconChevronRight } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { cn } from '../utils/cn.js';

/**
 * Links come in three shapes, and they are genuinely different components
 * rather than one with a `kind` prop — each has a different hit area, a
 * different affordance and a different place in the reading order.
 */

export interface HawkLinkProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Router link component, when the app routes client-side. */
  as?: ElementType;
  to?: string;
  disabled?: boolean;
  external?: boolean;
  className?: string;
}

/**
 * An inline action link — inside a sentence, or beside a label.
 *
 * Underlined on hover rather than always: a paragraph carrying three
 * permanently-underlined links reads as damaged text.
 */
export function HawkLink({
  children,
  href,
  onClick,
  as,
  to,
  disabled = false,
  external = false,
  className,
}: HawkLinkProps) {
  const Tag: ElementType = as ?? (href ? 'a' : 'button');
  return (
    <Tag
      href={href}
      to={to}
      type={Tag === 'button' ? 'button' : undefined}
      onClick={disabled ? undefined : onClick}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer noopener' : undefined}
      className={cn(
        'hawk-focusable inline items-center rounded-hawk-xs font-medium text-hawk-acc',
        'underline-offset-2 hover:underline',
        disabled && 'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export interface HawkNavLinkProps {
  label: string;
  icon?: HawkIconComponent;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  as?: ElementType;
  to?: string;
  /** A count or status suffix, right-aligned. */
  trailing?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** A sidebar / nav-list entry. Full-row hit area, selection state. */
export function HawkNavLink({
  label,
  icon,
  active = false,
  href,
  onClick,
  as,
  to,
  trailing,
  disabled = false,
  className,
}: HawkNavLinkProps) {
  const Tag: ElementType = as ?? (href ? 'a' : 'button');
  return (
    <Tag
      href={href}
      to={to}
      type={Tag === 'button' ? 'button' : undefined}
      onClick={disabled ? undefined : onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'hawk-focusable hawk-motion flex w-full items-center gap-hawk-4 rounded-hawk-sm',
        'px-hawk-5 py-hawk-4 text-left text-hawk-body font-medium',
        'transition-colors duration-hawk-fast ease-hawk-standard',
        active
          ? 'bg-hawk-acc-soft text-hawk-acc-on-soft'
          : 'text-hawk-ink-muted hover:bg-hawk-sunken hover:text-hawk-ink',
        disabled && 'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
        className,
      )}
    >
      {icon && <HawkIcon icon={icon} size={17} />}
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </Tag>
  );
}

export interface HawkMenuLinkProps {
  label: string;
  description?: string;
  icon?: HawkIconComponent;
  onClick?: () => void;
  href?: string;
  as?: ElementType;
  to?: string;
  /** Renders the row in the destructive register — "Delete account". */
  destructive?: boolean;
  disabled?: boolean;
  /** Hide the trailing chevron — for a row that acts rather than navigates. */
  noChevron?: boolean;
  trailing?: ReactNode;
  className?: string;
}

/**
 * A menu row — the profile-hub / settings-list shape.
 *
 * Carries the chevron by default because these rows navigate; `noChevron` is
 * for the rows that act in place (toggle a setting, sign out), where a chevron
 * would promise a screen that never arrives.
 */
export function HawkMenuLink({
  label,
  description,
  icon,
  onClick,
  href,
  as,
  to,
  destructive = false,
  disabled = false,
  noChevron = false,
  trailing,
  className,
}: HawkMenuLinkProps) {
  const Tag: ElementType = as ?? (href ? 'a' : 'button');
  return (
    <Tag
      href={href}
      to={to}
      type={Tag === 'button' ? 'button' : undefined}
      onClick={disabled ? undefined : onClick}
      className={cn(
        'hawk-focusable hawk-motion flex w-full items-center gap-hawk-5 px-hawk-pad py-hawk-row-y',
        'text-left transition-colors duration-hawk-fast ease-hawk-standard',
        'hover:bg-hawk-hovered',
        disabled && 'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-hawk-sm',
            destructive
              ? 'bg-hawk-danger-soft text-hawk-danger'
              : 'bg-hawk-sunken text-hawk-ink-muted',
          )}
        >
          <HawkIcon icon={icon} size={17} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <HawkText
          variant="body"
          ink={destructive ? undefined : 'strong'}
          className={cn('font-medium', destructive && 'text-hawk-danger')}
        >
          {label}
        </HawkText>
        {description && (
          <HawkText variant="caption" ink="muted" clamp={1}>
            {description}
          </HawkText>
        )}
      </span>
      {trailing}
      {!noChevron && (
        <HawkIcon icon={IconChevronRight} size={16} className="text-hawk-ink-disabled" />
      )}
    </Tag>
  );
}
