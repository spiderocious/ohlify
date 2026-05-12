import { AppButton, AppText } from '@ohlify/ui';

interface CursorPaginationProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Optional displayed count (e.g. "Showing 20 results"). */
  itemCount?: number;
}

/**
 * Simple cursor-based pager. The list view holds a stack of cursors —
 * Next pushes the response's `next_cursor`, Prev pops. We don't try to
 * implement page numbers because the server doesn't return totals.
 */
export function CursorPagination({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  itemCount,
}: CursorPaginationProps) {
  return (
    <div className="flex items-center justify-between">
      <AppText variant="bodySmall" className="text-text-muted">
        {itemCount !== undefined ? `${itemCount} on this page` : ''}
      </AppText>
      <div className="flex gap-2">
        <AppButton
          label="Prev"
          variant="outline"
          height={36}
          onPressed={hasPrev ? onPrev : undefined}
        />
        <AppButton
          label="Next"
          variant="outline"
          height={36}
          onPressed={hasNext ? onNext : undefined}
        />
      </div>
    </div>
  );
}
