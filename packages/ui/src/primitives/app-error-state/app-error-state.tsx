import { IconAlertCircle } from '@icons';

import { cn } from '../../utils/cn.js';

interface AppErrorStateProps {
  message?: string;
  className?: string;
}

/** Mirrors mobile AppErrorState: centered icon + error-tinted text, padded. */
export function AppErrorState({ message, className }: AppErrorStateProps) {
  return (
    <div className={cn('flex w-full flex-col items-center justify-center p-6', className)}>
      <IconAlertCircle size={40} color="var(--ohl-error)" />
      <p className="mt-3 text-center text-sm font-normal text-error">
        {message ?? 'Something went wrong.'}
      </p>
    </div>
  );
}

interface AppEmptyStateProps {
  message?: string;
  className?: string;
}

export function AppEmptyState({ message = 'Nothing here yet.', className }: AppEmptyStateProps) {
  return (
    <div className={cn('flex w-full items-center justify-center p-6', className)}>
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}
