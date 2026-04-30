import { IconBell, IconCopy } from '@icons';
import { CopyToClipboard, Show } from 'meemaw';


import { cn } from '../../utils/cn.js';

interface AppHeaderProps {
  notificationCount?: number;
  /** When provided, the Copy-link pill copies this value to the clipboard. */
  shareUrl?: string;
  onCopyLink?: () => void;
  onNotification?: () => void;
  /** Optional logo override. Default: text wordmark. */
  logo?: React.ReactNode;
  className?: string;
}

/**
 * Mirrors mobile/lib/ui/widgets/app_header/app_header.dart.
 * 64px tall row: logo (left), Copy-link pill, notification bell with badge.
 *
 * Uses meemaw's <Show> for the badge and <CopyToClipboard> for the share-url
 * action, matching the declarative pattern documented in docs/web-guide/guide.md.
 */
export function AppHeader({
  notificationCount = 0,
  shareUrl,
  onCopyLink,
  onNotification,
  logo,
  className,
}: AppHeaderProps) {
  return (
    <header className={cn('flex h-16 items-center bg-surface px-5', className)}>
      {logo ?? <span className="text-xl font-extrabold text-text-deep-blue">ohlify</span>}
      <span className="flex-1" />

      <CopyToClipboard text={shareUrl ?? ''} onSuccess={onCopyLink}>
        {(copy, copied) => (
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-pill bg-white px-3.5 py-2 text-[13px] font-semibold text-text-primary"
          >
            <IconCopy size={16} />
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        )}
      </CopyToClipboard>
      <span className="ml-2.5" />

      <button
        type="button"
        onClick={onNotification}
        aria-label="Notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
      >
        <IconBell size={20} color="var(--ohl-primary)" />
        <Show when={notificationCount > 0}>
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white"
            aria-label={`${notificationCount} unread`}
          >
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        </Show>
      </button>
    </header>
  );
}
