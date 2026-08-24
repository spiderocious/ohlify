import type { ElementType, ReactNode } from 'react';

import { HawkNavLink } from '../actions/link.js';
import { HawkAvatar } from '../display/avatar.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import { IconSettings } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HawkRegister, HawkRegisterScope } from '../theme/register.js';
import { cn } from '../utils/cn.js';

/**
 * The admin shell.
 *
 * Opens a BOARD register zone around everything it contains, so every control
 * inside resolves to the dense scale automatically — a `md` button is 34px
 * here and 48px in the consumer app, from one class rather than a prop passed
 * down through every component.
 *
 * That is the whole point of A16 in the spec: *"Nothing here is a new
 * component. Every control is the consumer component rendered inside
 * `.board-zone`."*
 */
export interface HawkAdminNavItem {
  key: string;
  label: string;
  icon?: HawkIconComponent;
  href?: string;
  onClick?: () => void;
  badge?: ReactNode;
  /** Groups items under a heading in the sidebar. */
  group?: string;
}

export interface HawkAdminShellProps {
  children: ReactNode;
  /** Sidebar entries. */
  nav: ReadonlyArray<HawkAdminNavItem>;
  /** The active item's key. */
  activeKey?: string;
  /** Product mark at the top of the sidebar. */
  brand?: ReactNode;
  /** The signed-in operator. */
  user?: { name: string; role?: string; avatarUrl?: string };
  /** Top-bar content — breadcrumb, search, actions. */
  topbar?: ReactNode;
  /** Router link component, when the app routes client-side. */
  linkAs?: ElementType;
  className?: string;
}

export function HawkAdminShell({
  children,
  nav,
  activeKey,
  brand,
  user,
  topbar,
  linkAs,
  className,
}: HawkAdminShellProps) {
  // Preserve declaration order while grouping: a sidebar that reorders itself
  // because a group name sorted differently is a sidebar operators re-learn.
  const groups: Array<{ name: string | undefined; items: HawkAdminNavItem[] }> = [];
  for (const item of nav) {
    const last = groups[groups.length - 1];
    if (last && last.name === item.group) last.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }

  return (
    <HawkRegisterScope
      value={HawkRegister.BOARD}
      className={cn('flex h-full min-h-0 bg-hawk-ground', className)}
    >
      <aside className="flex w-60 shrink-0 flex-col border-r border-hawk-line bg-hawk-paper">
        {brand && (
          <div className="flex h-14 shrink-0 items-center border-b border-hawk-line px-hawk-pad">
            {brand}
          </div>
        )}

        <nav className="flex min-h-0 flex-1 flex-col gap-hawk-5 overflow-y-auto p-hawk-4">
          {groups.map((group, index) => (
            <div key={group.name ?? `group-${index}`} className="flex flex-col gap-hawk-1">
              {group.name && (
                <HawkText variant="overline" ink="disabled" className="px-hawk-5 pb-hawk-2">
                  {group.name}
                </HawkText>
              )}
              {group.items.map((item) => (
                <HawkNavLink
                  key={item.key}
                  label={item.label}
                  {...(item.icon ? { icon: item.icon } : {})}
                  active={item.key === activeKey}
                  {...(item.href ? { href: item.href, to: item.href } : {})}
                  {...(item.onClick ? { onClick: item.onClick } : {})}
                  {...(linkAs && item.href ? { as: linkAs } : {})}
                  trailing={item.badge}
                />
              ))}
            </div>
          ))}
        </nav>

        {user && (
          <div className="flex shrink-0 items-center gap-hawk-4 border-t border-hawk-line p-hawk-5">
            <HawkAvatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="flex min-w-0 flex-1 flex-col">
              <HawkText variant="label" ink="strong" clamp={1}>
                {user.name}
              </HawkText>
              {user.role && (
                <HawkText variant="tiny" ink="muted" clamp={1}>
                  {user.role}
                </HawkText>
              )}
            </div>
          </div>
        )}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {topbar && (
          <header className="flex h-14 shrink-0 items-center gap-hawk-5 border-b border-hawk-line bg-hawk-paper px-hawk-pad">
            {topbar}
          </header>
        )}
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </HawkRegisterScope>
  );
}

/** The page header inside an admin screen. */
export function HawkAdminPageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-hawk-3 px-hawk-pad py-hawk-6', className)}>
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-hawk-5">
        <div className="flex min-w-0 flex-col gap-hawk-1">
          <HawkText variant="header" ink="strong" as="h1">
            {title}
          </HawkText>
          {subtitle && (
            <HawkText variant="caption" ink="muted">
              {subtitle}
            </HawkText>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-hawk-3">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * A panel — the board's card.
 *
 * Squarer and tighter than the consumer card, and hairline-first. It resolves
 * its radius from the register, so this same component is a soft 16px card if
 * it ever renders inside a PASS zone.
 */
export function HawkAdminPanel({
  title,
  actions,
  children,
  flush = false,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden rounded-hawk border border-hawk-line bg-hawk-paper',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center gap-hawk-4 border-b border-hawk-line px-hawk-pad py-hawk-4">
          {title && (
            <HawkText variant="label" ink="strong" className="flex-1 font-semibold">
              {title}
            </HawkText>
          )}
          {actions}
        </div>
      )}
      <div className={cn(!flush && 'p-hawk-pad')}>{children}</div>
    </section>
  );
}

/**
 * The bulk-action bar.
 *
 * Appears only when rows are selected, and states the count. A bulk action that
 * does not say how many records it will touch is how an operator approves forty
 * withdrawals meaning to approve four.
 */
export function HawkBulkActionBar({
  count,
  onClear,
  children,
  className,
}: {
  count: number;
  onClear?: () => void;
  children: ReactNode;
  className?: string;
}) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-hawk-5 border-b border-hawk-acc-border bg-hawk-acc-soft px-hawk-pad py-hawk-4',
        className,
      )}
    >
      <HawkText variant="label" className="font-semibold text-hawk-acc-on-soft" record>
        {count} selected
      </HawkText>
      <div className="flex flex-1 items-center gap-hawk-3">{children}</div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="hawk-focusable rounded-hawk-xs text-hawk-caption font-semibold text-hawk-acc-on-soft hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkModerationItemProps {
  /** What was reported. */
  subject: ReactNode;
  /** The reported content itself. */
  content?: ReactNode;
  reporter?: string;
  reason: string;
  timestamp?: string;
  /** Prior strikes against this user, for context. */
  priorStrikes?: number;
  onUphold?: () => void;
  onDismiss?: () => void;
  actions?: ReactNode;
  className?: string;
}

/**
 * A moderation-queue item.
 *
 * Shows prior strikes beside the report. A moderator deciding on a first
 * offence and a fourth needs to know which one this is *before* they act, not
 * after opening a second screen — the queue is where the decision happens.
 */
export function HawkModerationItem({
  subject,
  content,
  reporter,
  reason,
  timestamp,
  priorStrikes,
  onUphold,
  onDismiss,
  actions,
  className,
}: HawkModerationItemProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-hawk-4 border-b border-hawk-line px-hawk-pad py-hawk-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-hawk-4">
        <HawkText variant="label" ink="strong" className="font-semibold">
          {subject}
        </HawkText>
        <span className="rounded-hawk-xs bg-hawk-critical-soft px-hawk-3 py-px text-hawk-tiny font-bold uppercase tracking-hawk-overline text-hawk-critical-on-soft">
          {reason}
        </span>
        {priorStrikes !== undefined && priorStrikes > 0 && (
          <span className="hawk-record rounded-hawk-xs bg-hawk-caution-soft px-hawk-3 py-px text-hawk-tiny font-bold tabular-nums text-hawk-caution-on-soft">
            {priorStrikes} prior {priorStrikes === 1 ? 'strike' : 'strikes'}
          </span>
        )}
        {timestamp && (
          <HawkText variant="tiny" ink="disabled" record className="ml-auto">
            {timestamp}
          </HawkText>
        )}
      </div>

      {content && (
        <div className="rounded-hawk-sm bg-hawk-stock px-hawk-5 py-hawk-4 text-hawk-label text-hawk-ink">
          {content}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-hawk-4">
        {reporter && (
          <HawkText variant="caption" ink="muted">
            Reported by {reporter}
          </HawkText>
        )}
        <div className="ml-auto flex items-center gap-hawk-3">
          {actions}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="hawk-focusable rounded-hawk-xs text-hawk-caption font-semibold text-hawk-ink-muted hover:underline"
            >
              Dismiss
            </button>
          )}
          {onUphold && (
            <button
              type="button"
              onClick={onUphold}
              className="hawk-focusable rounded-hawk-xs text-hawk-caption font-semibold text-hawk-danger hover:underline"
            >
              Uphold
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Marks a value as the system's own rather than a user's. */
export function HawkSystemTag({ label = 'System' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-hawk-2 rounded-hawk-xs bg-hawk-sunken px-hawk-3 py-px text-hawk-tiny font-bold uppercase tracking-hawk-overline text-hawk-ink-muted">
      <HawkIcon icon={IconSettings} size={9} />
      {label}
    </span>
  );
}
