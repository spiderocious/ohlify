import type { ReactNode } from 'react';

import { HawkButton } from '../actions/button.js';
import { HawkChip } from '../actions/chip.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import { IconClose, IconFilter } from '../icons/index.js';
import { HawkSearchInput } from '../inputs/text-input.js';
import { cn } from '../utils/cn.js';

/**
 * The filter bar.
 *
 * Two rules the specimen is explicit about, and both are about collisions:
 *
 * 1. **The status tabs and the filter row sit on separate lines.** Crowding
 *    them onto one line is what makes an admin queue's header collapse the
 *    moment a status gains a longer label.
 * 2. **Active filters are always visible.** A filter applied behind a panel the
 *    operator has closed is how a queue comes to look empty and gets escalated
 *    as a bug.
 */
export interface HawkFilterTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface HawkFilterBarProps<T extends string> {
  /** The status tabs — usually the real backend enum, with live counts. */
  tabs?: ReadonlyArray<HawkFilterTab<T>>;
  activeTab?: T;
  onTabChange?: (value: T) => void;
  /** Search box. */
  query?: string;
  onQueryChange?: (query: string) => void;
  searchPlaceholder?: string;
  /** The filter controls — dropdowns, date ranges. */
  children?: ReactNode;
  /** Right-side actions — export, bulk operations. */
  actions?: ReactNode;
  className?: string;
}

export function HawkFilterBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  query,
  onQueryChange,
  searchPlaceholder = 'Search',
  children,
  actions,
  className,
}: HawkFilterBarProps<T>) {
  return (
    <div className={cn('hawk-board flex flex-col', className)}>
      {tabs && tabs.length > 0 && (
        <div
          role="tablist"
          className="flex gap-hawk-2 overflow-x-auto border-b border-hawk-line px-hawk-pad"
        >
          {tabs.map((tab) => {
            const active = tab.value === activeTab;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange?.(tab.value)}
                className={cn(
                  'hawk-focusable relative shrink-0 whitespace-nowrap px-hawk-4 py-hawk-4',
                  'text-hawk-label font-medium transition-colors duration-hawk-fast',
                  active ? 'text-hawk-acc' : 'text-hawk-ink-muted hover:text-hawk-ink',
                )}
              >
                <span className="inline-flex items-center gap-hawk-2">
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        'hawk-record rounded-hawk-pill px-hawk-3 py-px text-hawk-tiny font-bold tabular-nums',
                        active
                          ? 'bg-hawk-acc-soft text-hawk-acc-on-soft'
                          : 'bg-hawk-sunken text-hawk-ink-muted',
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
      )}

      {/* The filter row, on its own line. */}
      <div className="flex flex-wrap items-center gap-hawk-4 border-b border-hawk-line px-hawk-pad py-hawk-4">
        {onQueryChange && (
          <div className="min-w-[14rem] max-w-sm flex-1">
            <HawkSearchInput
              value={query}
              onChange={onQueryChange}
              placeholder={searchPlaceholder}
            />
          </div>
        )}
        {children}
        {actions && <div className="ml-auto flex items-center gap-hawk-3">{actions}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkActiveFilter {
  key: string;
  label: string;
  /** The chosen value, shown after the label. */
  value: string;
  onRemove: () => void;
}

export interface HawkActiveFiltersProps {
  filters: ReadonlyArray<HawkActiveFilter>;
  onClearAll?: () => void;
  className?: string;
}

/**
 * The active-filter row.
 *
 * Renders nothing when no filters are applied — an empty "Filters:" label is
 * chrome that costs a line and says nothing.
 */
export function HawkActiveFilters({ filters, onClearAll, className }: HawkActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-hawk-3 border-b border-hawk-line bg-hawk-stock px-hawk-pad py-hawk-3',
        className,
      )}
    >
      <HawkIcon icon={IconFilter} size={12} className="text-hawk-ink-muted" />
      {filters.map((filter) => (
        <HawkChip
          key={filter.key}
          label={`${filter.label}: ${filter.value}`}
          size="sm"
          selected
          onRemove={filter.onRemove}
        />
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="hawk-focusable ml-hawk-2 rounded-hawk-xs text-hawk-caption font-semibold text-hawk-ink-muted hover:text-hawk-acc hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkFilterRailProps {
  children: ReactNode;
  /** Applied-filter count, shown in the header. */
  activeCount?: number;
  onClearAll?: () => void;
  onClose?: () => void;
  className?: string;
}

/**
 * A filter rail — for a queue with more dimensions than a bar can hold.
 *
 * The spec reaches for this when the filter row would wrap. A rail keeps the
 * table's own width stable as filters are added, which a wrapping bar does not.
 */
export function HawkFilterRail({
  children,
  activeCount = 0,
  onClearAll,
  onClose,
  className,
}: HawkFilterRailProps) {
  return (
    <aside
      className={cn(
        'hawk-board flex w-64 shrink-0 flex-col border-r border-hawk-line bg-hawk-paper',
        className,
      )}
    >
      <div className="flex items-center gap-hawk-3 border-b border-hawk-line px-hawk-pad py-hawk-4">
        <HawkIcon icon={IconFilter} size={14} className="text-hawk-ink-muted" />
        <HawkText variant="label" ink="strong" className="flex-1 font-semibold">
          Filters
        </HawkText>
        {activeCount > 0 && (
          <span className="hawk-record rounded-hawk-pill bg-hawk-acc-soft px-hawk-3 text-hawk-tiny font-bold tabular-nums text-hawk-acc-on-soft">
            {activeCount}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="hawk-focusable rounded-hawk-xs p-0.5 text-hawk-ink-muted hover:text-hawk-ink"
          >
            <HawkIcon icon={IconClose} size={14} />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-hawk-6 overflow-y-auto p-hawk-pad">
        {children}
      </div>

      {activeCount > 0 && onClearAll && (
        <div className="border-t border-hawk-line p-hawk-pad">
          <HawkButton
            label="Clear all filters"
            variant="outline"
            size="sm"
            block
            onClick={onClearAll}
          />
        </div>
      )}
    </aside>
  );
}

/** A titled group inside the rail. */
export function HawkFilterGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-hawk-3', className)}>
      <HawkText variant="overline" ink="muted">
        {title}
      </HawkText>
      {children}
    </div>
  );
}
