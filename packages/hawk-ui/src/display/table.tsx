import type { ReactNode } from 'react';

import { HawkDataState, formatAge } from '../contracts/data-state.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkSkeletonLine } from '../foundation/skeleton.js';
import { HawkText } from '../foundation/text.js';
import { IconChevronDown, IconChevronUp } from '../icons/index.js';
import { cn } from '../utils/cn.js';

/**
 * The table — the BOARD register's centrepiece.
 *
 * Owns loading, empty, error and stale rendering so feature code never
 * reimplements those four. That is the same division the older admin
 * `DataTable` established and it was right; this version adds the freshness
 * contract (CONTRACTS §10) and a skeleton that mirrors the real row shape
 * rather than a spinner in a merged cell.
 *
 * Columns are **fixed-width with truncation**, which is the specimen's own
 * rule: a long Nigerian name must ellipsis rather than push the amount column
 * out of alignment. A board whose columns move between rows is not scannable,
 * and scanning is the only thing a board is for.
 */
export interface HawkColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** CSS width — `'12rem'`, `'20%'`. */
  width?: string;
  /** Marks the column sortable; the caller owns the sort itself. */
  sortable?: boolean;
  className?: string;
}

export interface HawkSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface HawkTableProps<T> {
  columns: ReadonlyArray<HawkColumn<T>>;
  rows: ReadonlyArray<T> | undefined;
  rowKey: (row: T) => string;
  dataState?: HawkDataState;
  /** Age of cached rows, in ms — rendered as a non-blocking stale banner. */
  ageMs?: number;
  /** Non-blocking when rows exist; full-surface only on a cold cache. */
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  sort?: HawkSort;
  onSortChange?: (sort: HawkSort) => void;
  /** Bulk selection. Rows returning false cannot be selected. */
  selectable?: (row: T) => boolean;
  selectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  footer?: ReactNode;
  /** Skeleton row count while loading. */
  skeletonRows?: number;
  /**
   * Drops the table's own card.
   *
   * Set this when the table sits inside a `HawkAdminPanel flush` — the panel
   * already draws the border and the ground, and two nested cards read as a
   * mistake rather than as emphasis.
   */
  bare?: boolean;
  className?: string;
}

const ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

export function HawkTable<T>({
  columns,
  rows,
  rowKey,
  dataState = HawkDataState.FRESH,
  ageMs,
  error,
  onRetry,
  emptyTitle = 'Nothing here',
  emptyDescription,
  onRowClick,
  sort,
  onSortChange,
  selectable,
  selectedKeys,
  onSelectionChange,
  footer,
  skeletonRows = 6,
  bare = false,
  className,
}: HawkTableProps<T>) {
  const selected = selectedKeys ?? new Set<string>();
  const selectableRows = selectable ? (rows ?? []).filter(selectable) : [];
  const allSelected =
    selectableRows.length > 0 && selectableRows.every((row) => selected.has(rowKey(row)));

  const columnCount = columns.length + (selectable ? 1 : 0);
  const loading = dataState === HawkDataState.LOADING;
  const stale = dataState === HawkDataState.STALE;
  const hasRows = Boolean(rows && rows.length > 0);

  const toggleAll = () =>
    onSelectionChange?.(allSelected ? new Set() : new Set(selectableRows.map(rowKey)));

  const toggleOne = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange?.(next);
  };

  return (
    <div
      className={cn(
        // A table is a SURFACE, not a bare block. Without its own border and
        // ground it floats on the page with nothing holding the columns
        // together, and the header rule reads as a stray line rather than as
        // the top of something. `overflow-hidden` is what lets the sticky
        // header and the footer sit flush inside the rounded corners.
        'hawk-board flex min-h-0 flex-col overflow-hidden',
        !bare && 'rounded-hawk border border-hawk-line bg-hawk-paper',
        className,
      )}
    >
      {/* The stale banner is thin and sits above the data rather than replacing
          it — CONTRACTS §10. The rows stay readable while the refresh runs. */}
      {stale && (
        <div className="flex items-center justify-between gap-hawk-4 border-b border-hawk-line bg-hawk-stock px-hawk-pad py-hawk-3">
          <HawkText variant="caption" ink="muted">
            Showing saved data{ageMs !== undefined ? ` · last refreshed ${formatAge(ageMs)}` : ''}
          </HawkText>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="hawk-focusable rounded-hawk-xs text-hawk-caption font-semibold text-hawk-acc hover:underline"
            >
              Refresh
            </button>
          )}
        </div>
      )}

      {error && hasRows && (
        <div className="flex items-center justify-between gap-hawk-4 border-b border-hawk-line bg-hawk-caution-soft px-hawk-pad py-hawk-3">
          <HawkText variant="caption" className="text-hawk-caution-on-soft">
            {error}
          </HawkText>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="hawk-focusable rounded-hawk-xs text-hawk-caption font-semibold text-hawk-caution-on-soft hover:underline"
            >
              Try again
            </button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-hawk-label">
          <thead className="sticky top-0 z-hawk-raised bg-hawk-stock">
            <tr className="border-b border-hawk-line-strong">
              {selectable && (
                <th className="w-12 px-hawk-pad py-hawk-4">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    disabled={selectableRows.length === 0}
                    onChange={toggleAll}
                    className="accent-[var(--hawk-acc)]"
                  />
                </th>
              )}
              {columns.map((column) => {
                const sorted = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      'px-hawk-pad py-hawk-4 text-hawk-overline font-bold uppercase',
                      'tracking-hawk-overline text-hawk-ink-muted',
                      ALIGN[column.align ?? 'left'],
                      column.className,
                    )}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSortChange({
                            key: column.key,
                            direction: sorted && sort.direction === 'asc' ? 'desc' : 'asc',
                          })
                        }
                        className="hawk-focusable inline-flex items-center gap-hawk-2 rounded-hawk-xs hover:text-hawk-ink"
                      >
                        {column.header}
                        {sorted && (
                          <HawkIcon
                            icon={sort.direction === 'asc' ? IconChevronUp : IconChevronDown}
                            size={11}
                          />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading &&
              Array.from({ length: skeletonRows }, (_, index) => (
                <tr
                  key={`skeleton-${index}`}
                  className="border-b border-hawk-line"
                  // Announced, not silent. A screen reader on a loading table
                  // otherwise reads an empty grid and moves on. Only the first
                  // row carries the role — one announcement, not six.
                  {...(index === 0
                    ? { role: 'status', 'aria-busy': true, 'aria-label': 'Loading rows' }
                    : {})}
                >
                  {selectable && (
                    <td className="px-hawk-pad py-hawk-row-y">
                      <HawkSkeletonLine widthFactor={1} height={12} />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-hawk-pad py-hawk-row-y">
                      <HawkSkeletonLine widthFactor={column.align === 'right' ? 0.4 : 0.75} />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && error && !hasRows && (
              <tr>
                <td colSpan={columnCount} className="px-hawk-pad py-hawk-12">
                  <div className="flex flex-col items-center gap-hawk-4 text-center">
                    <HawkText variant="medium" ink="strong">
                      Could not load
                    </HawkText>
                    <HawkText variant="caption" ink="muted">
                      {error}
                    </HawkText>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="hawk-focusable rounded-hawk-xs text-hawk-label font-semibold text-hawk-acc hover:underline"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {!loading && !error && !hasRows && (
              <tr>
                <td colSpan={columnCount} className="px-hawk-pad py-hawk-12">
                  <div className="flex flex-col items-center gap-hawk-3 text-center">
                    <HawkText variant="medium" ink="strong">
                      {emptyTitle}
                    </HawkText>
                    {emptyDescription && (
                      <HawkText variant="caption" ink="muted">
                        {emptyDescription}
                      </HawkText>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              rows?.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-hawk-line transition-colors duration-hawk-fast',
                      onRowClick && 'cursor-pointer hover:bg-hawk-hovered',
                      selected.has(key) && 'bg-hawk-acc-soft',
                    )}
                  >
                    {selectable && (
                      <td
                        className="px-hawk-pad py-hawk-row-y"
                        // Ticking a box to build a bulk action must not also
                        // open the row's detail panel.
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={selected.has(key)}
                          disabled={!selectable(row)}
                          onChange={() => toggleOne(key)}
                          className="accent-[var(--hawk-acc)]"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'truncate px-hawk-pad py-hawk-row-y text-hawk-ink',
                          ALIGN[column.align ?? 'left'],
                          column.align === 'right' && 'hawk-record tabular-nums',
                          column.className,
                        )}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="border-t border-hawk-line bg-hawk-stock px-hawk-pad py-hawk-5">{footer}</div>
      )}
    </div>
  );
}
