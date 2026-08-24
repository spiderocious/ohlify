import type { ReactNode } from 'react';

import {
  HawkAdminPageHeader,
  HawkAdminPanel,
  HawkCaption,
  HawkDataState,
  HawkFilterBar,
  HawkKpiStrip,
  HawkTable,
  HawkText,
  type HawkColumn,
  type HawkKpi,
  type HawkSort,
} from '@ohlify/hawk-ui';
import type { ApiError } from '@ohlify/api';

import { CursorPagination } from './cursor-pagination.js';

/**
 * The shape every admin list screen repeats.
 *
 * Sixteen screens were each hand-rolling the same page header → KPI strip →
 * filter bar → table → pagination stack, which is sixteen chances for one of
 * them to drift a gutter or forget an empty state. This holds the arrangement
 * once; screens supply their columns, filters and actions.
 *
 * It is deliberately a *layout*, not an abstraction over the data: each screen
 * keeps its own hook, its own filters and its own row type. Nothing here knows
 * what a withdrawal is.
 */

export interface BoardListResult<T> {
  items: T[];
  isLoading: boolean;
  error: ApiError | null;
  hasNext: boolean;
  hasPrev: boolean;
  goNext: () => void;
  goPrev: () => void;
  refetch: () => void;
}

export interface BoardScreenProps<T> {
  title: string;
  subtitle?: ReactNode;
  /** Header-right controls — export, sync, create. */
  actions?: ReactNode;
  /** The metric band. Omit on screens with nothing worth counting. */
  kpis?: ReadonlyArray<HawkKpi>;

  /** Status tabs, with live counts where the API provides them. */
  tabs?: ReadonlyArray<{ value: string; label: string; count?: number }>;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  query?: string;
  onQueryChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Extra filter controls — dropdowns, date ranges. */
  filters?: ReactNode;
  /** Bulk-action bar, rendered between the filters and the table. */
  bulkBar?: ReactNode;

  columns: ReadonlyArray<HawkColumn<T>>;
  list: BoardListResult<T>;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: (row: T) => boolean;
  selectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  sort?: HawkSort;
  onSortChange?: (sort: HawkSort) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Panels rendered below the table — summaries, notes. */
  children?: ReactNode;
}

export function BoardScreen<T>({
  title,
  subtitle,
  actions,
  kpis,
  tabs,
  activeTab,
  onTabChange,
  query,
  onQueryChange,
  searchPlaceholder,
  filters,
  bulkBar,
  columns,
  list,
  rowKey,
  onRowClick,
  selectable,
  selectedKeys,
  onSelectionChange,
  sort,
  onSortChange,
  emptyTitle = 'Nothing here',
  emptyDescription,
  children,
}: BoardScreenProps<T>) {
  const hasFilterBar = Boolean(tabs || onQueryChange || filters);

  return (
    <>
      <HawkAdminPageHeader
        title={title}
        {...(subtitle !== undefined ? { subtitle } : {})}
        {...(actions ? { actions } : {})}
      />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        {kpis && kpis.length > 0 && <HawkKpiStrip items={kpis} />}

        <div className="flex flex-col">
          {hasFilterBar && (
            <HawkFilterBar
              {...(tabs ? { tabs } : {})}
              {...(activeTab !== undefined ? { activeTab } : {})}
              {...(onTabChange ? { onTabChange } : {})}
              {...(query !== undefined ? { query } : {})}
              {...(onQueryChange ? { onQueryChange } : {})}
              {...(searchPlaceholder ? { searchPlaceholder } : {})}
            >
              {filters}
            </HawkFilterBar>
          )}

          {bulkBar}

          <HawkTable
            columns={columns}
            rows={list.items}
            rowKey={rowKey}
            dataState={list.isLoading ? HawkDataState.LOADING : HawkDataState.FRESH}
            // Non-blocking when rows exist, full-surface on a cold cache —
            // the table decides which, from whether it has anything to show.
            {...(list.error
              ? { error: list.error.errorMessage ?? 'Could not load' }
              : {})}
            onRetry={() => list.refetch()}
            {...(onRowClick ? { onRowClick } : {})}
            {...(selectable ? { selectable } : {})}
            {...(selectedKeys ? { selectedKeys } : {})}
            {...(onSelectionChange ? { onSelectionChange } : {})}
            {...(sort ? { sort } : {})}
            {...(onSortChange ? { onSortChange } : {})}
            emptyTitle={emptyTitle}
            {...(emptyDescription ? { emptyDescription } : {})}
            footer={
              <CursorPagination
                hasPrev={list.hasPrev}
                hasNext={list.hasNext}
                onPrev={list.goPrev}
                onNext={list.goNext}
                itemCount={list.items.length}
              />
            }
          />
        </div>

        {children}
      </div>
    </>
  );
}

/**
 * A titled panel of key-value rows — the detail-drawer and summary workhorse.
 *
 * Exists so a screen can drop a block of facts in without re-deciding the
 * grid every time.
 */
export function BoardFacts({
  title,
  children,
  note,
  className,
}: {
  title?: string;
  children: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  const body = (
    <div className="flex flex-col gap-hawk-4">
      <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">{children}</div>
      {note && (
        <HawkCaption ink="muted" className="leading-snug">
          {note}
        </HawkCaption>
      )}
    </div>
  );

  if (!title) return body;
  return (
    <HawkAdminPanel title={title} {...(className ? { className } : {})}>
      {body}
    </HawkAdminPanel>
  );
}

/** A section heading between stacked panels. */
export function BoardSectionHeading({
  title,
  hint,
}: {
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-hawk-4">
      <HawkText variant="label" ink="strong" className="font-semibold">
        {title}
      </HawkText>
      {hint && <HawkCaption ink="muted">{hint}</HawkCaption>}
    </div>
  );
}
