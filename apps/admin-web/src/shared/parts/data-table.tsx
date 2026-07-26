import type { ReactNode } from 'react';

import { AppLoader, AppText, cn } from '@ohlify/ui';
import { IconAlertCircle, IconInfo } from '@icons';

export interface ColumnDef<T> {
  /** Stable key used as the React key + cell key. */
  key: string;
  header: ReactNode;
  /** Cell renderer. */
  render: (row: T) => ReactNode;
  /** Optional class for the <th> + <td> in this column. */
  className?: string;
  /** Right-align by default? Defaults to false. */
  align?: 'left' | 'right' | 'center';
  /** Width hint for the column (CSS value). */
  width?: string;
}

interface DataTableProps<T> {
  columns: ReadonlyArray<ColumnDef<T>>;
  rows: ReadonlyArray<T> | undefined;
  rowKey: (row: T) => string;
  isLoading?: boolean;
  error?: { errorMessage?: string; message?: string } | null;
  /** Empty-state title. Defaults to 'No results'. */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Click handler — opens the row drawer / detail panel. */
  onRowClick?: (row: T) => void;
  /** Footer content (typically pagination). */
  footer?: ReactNode;
  /** Sticky-header table inside a scroll container. */
  className?: string;
  /**
   * Bulk selection. Supplying `selectable` adds a leading checkbox column;
   * rows it returns false for cannot be selected, so a caller can restrict
   * selection to the states an action is actually valid for.
   */
  selectable?: (row: T) => boolean;
  selectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;
}

const ALIGN: Record<NonNullable<ColumnDef<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

/**
 * The list-view workhorse. Owns loading/error/empty rendering so feature
 * code never reimplements those three states. Rows are clickable when
 * `onRowClick` is supplied — typically opens a detail drawer.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  emptyTitle = 'No results',
  emptyDescription,
  onRowClick,
  footer,
  className,
  selectable,
  selectedKeys,
  onSelectionChange,
}: DataTableProps<T>) {
  const selectableRows = selectable ? (rows ?? []).filter(selectable) : [];
  const selected = selectedKeys ?? new Set<string>();
  const allSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selected.has(rowKey(r)));

  const toggleAll = () => {
    onSelectionChange?.(allSelected ? new Set() : new Set(selectableRows.map(rowKey)));
  };

  const toggleOne = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange?.(next);
  };

  const columnCount = columns.length + (selectable ? 1 : 0);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[800px] border-collapse text-sm sm:table-fixed">
          <thead className="sticky top-0 z-10 bg-surface-light">
            <tr className="border-b border-border">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    disabled={selectableRows.length === 0}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    'px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted',
                    ALIGN[c.align ?? 'left'],
                    c.className,
                  )}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading && (!rows || rows.length === 0) && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-16">
                  <AppLoader />
                </td>
              </tr>
            )}

            {!isLoading && error && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <IconAlertCircle size={32} color="var(--ohl-error)" />
                    <AppText variant="bodyTitle" className="text-text-primary">
                      Couldn't load
                    </AppText>
                    <AppText variant="bodySmall" className="text-text-muted">
                      {error.errorMessage ?? error.message ?? 'Something went wrong.'}
                    </AppText>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && !error && rows && rows.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <IconInfo size={32} color="var(--ohl-text-muted)" />
                    <AppText variant="bodyTitle" className="text-text-primary">
                      {emptyTitle}
                    </AppText>
                    {emptyDescription && (
                      <AppText variant="bodySmall" className="text-text-muted">
                        {emptyDescription}
                      </AppText>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {rows?.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-border/60 transition',
                  onRowClick && 'cursor-pointer hover:bg-surface-light/60',
                  selected.has(rowKey(row)) && 'bg-primary/5',
                )}
              >
                {selectable && (
                  // Stops the click bubbling into onRowClick — ticking a box to
                  // build a bulk action must not also open the drawer.
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label="Select row"
                      checked={selected.has(rowKey(row))}
                      disabled={!selectable(row)}
                      onChange={() => toggleOne(rowKey(row))}
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-4 py-3 text-text-primary',
                      ALIGN[c.align ?? 'left'],
                      c.className,
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footer && <div className="border-t border-border bg-surface px-4 py-3">{footer}</div>}
    </div>
  );
}
