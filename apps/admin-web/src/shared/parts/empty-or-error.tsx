import { AppLoader, AppText } from '@ohlify/ui';
import { IconAlertCircle, IconInfo } from '@icons';

interface QueryViewProps {
  isLoading?: boolean;
  error?: { message?: string } | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
}

/**
 * Render guard for non-table queries (detail views, summaries, single
 * objects). Centralizes the loading / error / empty branches so screens
 * read top-to-bottom as `<QueryView ...><SuccessRender /></QueryView>`.
 */
export function QueryView({
  isLoading,
  error,
  isEmpty,
  emptyTitle = 'Nothing here',
  emptyDescription,
  children,
}: QueryViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <AppLoader />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <IconAlertCircle size={32} color="var(--ohl-error)" />
        <AppText variant="bodyTitle">Couldn't load</AppText>
        <AppText variant="bodySmall" className="text-text-muted">
          {error.message ?? 'Something went wrong.'}
        </AppText>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <IconInfo size={32} color="var(--ohl-text-muted)" />
        <AppText variant="bodyTitle">{emptyTitle}</AppText>
        {emptyDescription && (
          <AppText variant="bodySmall" className="text-text-muted">
            {emptyDescription}
          </AppText>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
