import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

import { HawkIconButton } from '../actions/icon-button.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
} from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HawkCountBadge } from '../status/badge.js';
import { cn } from '../utils/cn.js';

export interface HawkAppBarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  /** Right-side actions. */
  actions?: ReactNode;
  /** Sits directly on the content with no border — hero screens. */
  transparent?: boolean;
  /** Centres the title, leaving room for the back button. */
  centred?: boolean;
  sticky?: boolean;
  className?: string;
}

export function HawkAppBar({
  title,
  subtitle,
  onBack,
  actions,
  transparent = false,
  centred = false,
  sticky = true,
  className,
}: HawkAppBarProps) {
  return (
    <header
      className={cn(
        'flex h-14 items-center gap-hawk-4 px-hawk-pad',
        !transparent && 'border-b border-hawk-line bg-hawk-paper',
        sticky && 'sticky top-0 z-hawk-header',
        className,
      )}
    >
      {onBack && (
        <HawkIconButton icon={IconArrowLeft} label="Back" size="md" onClick={onBack} />
      )}

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          centred && 'items-center text-center',
        )}
      >
        {title && (
          <HawkText variant="body" ink="strong" clamp={1} className="font-semibold">
            {title}
          </HawkText>
        )}
        {subtitle && (
          <HawkText variant="caption" ink="muted" clamp={1}>
            {subtitle}
          </HawkText>
        )}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-hawk-2">{actions}</div>}
    </header>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkBottomNavItem<T extends string> {
  value: T;
  label: string;
  icon: HawkIconComponent;
  badge?: number;
}

export interface HawkBottomNavProps<T extends string> {
  items: ReadonlyArray<HawkBottomNavItem<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * The bottom navigation bar.
 *
 * Labels are always visible, never icon-only. An icon-only bar saves twelve
 * pixels and costs first-time users the ability to tell what anything does —
 * and this product's users include people whose first smartphone this is.
 */
export function HawkBottomNav<T extends string>({
  items,
  value,
  onChange,
  className,
}: HawkBottomNavProps<T>) {
  return (
    <nav
      className={cn(
        'flex items-stretch border-t border-hawk-line bg-hawk-nav-bg',
        'pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'hawk-focusable relative flex flex-1 flex-col items-center justify-center gap-hawk-1',
              'py-hawk-4 transition-colors duration-hawk-fast',
              active ? 'text-hawk-acc' : 'text-hawk-nav-inactive',
            )}
          >
            <span className="relative">
              <HawkIcon icon={item.icon} size={20} strokeWidth={active ? 2.2 : 1.75} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -right-2 -top-1">
                  <HawkCountBadge count={item.badge} />
                </span>
              )}
            </span>
            <span className="text-hawk-tiny font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkTab<T extends string> {
  value: T;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface HawkTabsProps<T extends string> {
  tabs: ReadonlyArray<HawkTab<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Stretch tabs to fill the width. */
  block?: boolean;
  className?: string;
}

/**
 * Underlined tabs.
 *
 * Scrolls horizontally rather than wrapping. A tab row that wraps to two lines
 * changes the page's height as the user switches, which pushes the content they
 * are reading.
 */
export function HawkTabs<T extends string>({
  tabs,
  value,
  onChange,
  block = false,
  className,
}: HawkTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-hawk-6 overflow-x-auto border-b border-hawk-line px-hawk-pad',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => onChange(tab.value)}
            className={cn(
              'hawk-focusable relative shrink-0 whitespace-nowrap py-hawk-4',
              'text-hawk-label font-medium transition-colors duration-hawk-fast',
              block && 'flex-1',
              active ? 'text-hawk-acc' : 'text-hawk-ink-muted hover:text-hawk-ink',
              tab.disabled && 'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
            )}
          >
            <span className="inline-flex items-center gap-hawk-2">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'hawk-record rounded-hawk-pill px-hawk-3 py-px text-hawk-tiny font-bold tabular-nums',
                    active ? 'bg-hawk-acc-soft text-hawk-acc-on-soft' : 'bg-hawk-sunken',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-hawk-acc" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkMenuItem {
  label: string;
  icon?: HawkIconComponent;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Renders a hairline above this item. */
  separated?: boolean;
}

export interface HawkMenuProps {
  items: ReadonlyArray<HawkMenuItem>;
  trigger: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/** A dropdown menu, anchored to its trigger. */
export function HawkMenu({ items, trigger, align = 'right', className }: HawkMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-hawk-popover mt-hawk-3 min-w-[12rem] overflow-hidden',
            'rounded-hawk-sm border border-hawk-line bg-hawk-paper py-hawk-2 shadow-hawk-popover',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-hawk-4 px-hawk-5 py-hawk-4 text-left',
                'text-hawk-label transition-colors duration-hawk-fast hover:bg-hawk-hovered',
                item.separated && 'mt-hawk-2 border-t border-hawk-line pt-hawk-4',
                item.destructive ? 'text-hawk-danger' : 'text-hawk-ink',
                item.disabled &&
                  'pointer-events-none opacity-[var(--hawk-state-disabled-opacity)]',
              )}
            >
              {item.icon && <HawkIcon icon={item.icon} size={15} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkBreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export function HawkBreadcrumb({
  items,
  as,
  className,
}: {
  items: ReadonlyArray<HawkBreadcrumbItem>;
  as?: ElementType;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-hawk-2', className)}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        const Tag: ElementType = last ? 'span' : (as ?? (item.href ? 'a' : 'button'));
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-hawk-2">
            <Tag
              href={last ? undefined : item.href}
              to={last ? undefined : item.href}
              type={Tag === 'button' ? 'button' : undefined}
              onClick={last ? undefined : item.onClick}
              aria-current={last ? 'page' : undefined}
              className={cn(
                'text-hawk-caption',
                last
                  ? 'font-semibold text-hawk-ink-strong'
                  : 'text-hawk-ink-muted hover:text-hawk-acc hover:underline',
              )}
            >
              {item.label}
            </Tag>
            {!last && (
              <HawkIcon icon={IconChevronRight} size={12} className="text-hawk-ink-disabled" />
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkPaginationProps {
  /** Whether more pages exist in each direction. */
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** "1–25 of 340" — optional, since a cursor API cannot always produce it. */
  summary?: ReactNode;
  loading?: boolean;
  className?: string;
}

/**
 * Cursor pagination.
 *
 * Deliberately previous/next rather than numbered pages: this backend is
 * cursor-only, and rendering page numbers over a cursor API would mean either
 * lying about how many pages exist or fetching everything to count.
 */
export function HawkPagination({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  summary,
  loading = false,
  className,
}: HawkPaginationProps) {
  return (
    <div className={cn('flex items-center justify-between gap-hawk-5', className)}>
      {summary ? (
        <HawkText variant="caption" ink="muted" record>
          {summary}
        </HawkText>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-hawk-3">
        <HawkIconButton
          icon={IconChevronLeft}
          label="Previous page"
          variant="outline"
          size="sm"
          disabled={!hasPrevious || loading}
          onClick={onPrevious}
        />
        <HawkIconButton
          icon={IconChevronRight}
          label="Next page"
          variant="outline"
          size="sm"
          disabled={!hasNext || loading}
          onClick={onNext}
        />
      </div>
    </div>
  );
}
