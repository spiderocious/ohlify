import { IconBell, IconPhone, IconWallet, type LucideIcon } from '@icons';
import { Show } from 'meemaw';

import type { AppNotification, AppNotificationKind } from '@ohlify/core';
import { AppText, cn } from '@ohlify/ui';

interface NotificationTileProps {
  notification: AppNotification;
  onTap: () => void;
}

const ICON_FOR: Record<AppNotificationKind, LucideIcon> = {
  missedCall: IconPhone,
  upcomingCall: IconPhone,
  paymentReceived: IconWallet,
  system: IconBell,
};

/** Mirrors mobile/lib/features/notifications/screen/parts/notification_tile.dart. */
export function NotificationTile({ notification: n, onTap }: NotificationTileProps) {
  const Icon = ICON_FOR[n.kind];
  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        'flex w-full items-start gap-3 px-1 py-3 text-left',
        n.read ? 'opacity-80' : '',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-dark text-primary">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
            {n.title}
          </AppText>
          <Show when={!n.read}>
            <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
          </Show>
        </div>
        <AppText
          variant="bodyNormal"
          align="start"
          color="var(--ohl-text-muted)"
          className="mt-0.5"
        >
          {n.message}
        </AppText>
        <AppText
          variant="bodySmall"
          align="start"
          color="var(--ohl-text-slate)"
          className="mt-1"
        >
          {n.timeLabel}
        </AppText>
      </div>
    </button>
  );
}
