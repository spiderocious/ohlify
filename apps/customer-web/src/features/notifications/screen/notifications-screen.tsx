import { IconBack, IconCheck } from '@icons';
import { Repeat, Show } from 'meemaw';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES, type AppNotification } from '@ohlify/core';
import { AppEmptyState, AppIconButton, AppText, cn } from '@ohlify/ui';

import {
  NotificationsProvider,
  useNotifications,
} from '../providers/notifications-provider.js';

import { NotificationTile } from './parts/notification-tile.js';
import { NotificationsTabs } from './parts/notifications-tabs.js';

const TAB_ROOTS = [
  ROUTES.HOME.absPath,
  ROUTES.CALLS.absPath,
  ROUTES.WALLET.absPath,
  ROUTES.PROFILE.absPath,
];

/** Mirrors mobile/lib/features/notifications/screen/notifications_screen.dart. */
export function NotificationsScreen() {
  return (
    <NotificationsProvider>
      <NotificationsScreenContent />
    </NotificationsProvider>
  );
}

function NotificationsScreenContent() {
  const navigate = useNavigate();
  const ctx = useNotifications();
  const [tab, setTab] = useState(0);

  const items = tab === 0 ? ctx.all : ctx.unread;
  const canMarkAll = ctx.unreadCount > 0;

  const onTap = (n: AppNotification) => {
    ctx.markAsRead(n.id);
    if (!n.route) return;
    if (TAB_ROOTS.includes(n.route)) {
      navigate(n.route, { replace: false });
    } else {
      navigate(n.route);
    }
  };

  const list = (
    <Show
      when={items.length > 0}
      fallback={<AppEmptyState message="No notifications yet." />}
    >
      <div className="divide-y divide-border">
        <Repeat each={items as AppNotification[]}>
          {(n) => <NotificationTile key={n.id} notification={n} onTap={() => onTap(n)} />}
        </Repeat>
      </div>
    </Show>
  );

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 pt-2 lg:max-w-5xl">
        <div className="flex items-center py-2">
          <AppIconButton
            icon={<IconBack color="var(--ohl-text-jet)" size={20} />}
            variant="ghost"
            backgroundColor="transparent"
            size={36}
            onPressed={() => navigate(-1)}
            ariaLabel="Back"
          />
          <AppText variant="body" weight={500} align="start" color="var(--ohl-text-jet)">
            Home
          </AppText>
          <span className="flex-1" />
          <button
            type="button"
            onClick={canMarkAll ? ctx.markAllAsRead : undefined}
            disabled={!canMarkAll}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2 font-sans text-xs font-semibold',
              canMarkAll
                ? 'border-post text-post'
                : 'border-border text-text-disabled',
            )}
          >
            Mark all as read
            <IconCheck size={14} />
          </button>
        </div>

        <AppText
          as="h1"
          variant="title"
          weight={800}
          align="start"
          color="var(--ohl-text-jet)"
          className="mt-3"
        >
          Notifications
        </AppText>

        <div className="mt-3">
          <NotificationsTabs
            activeIndex={tab}
            allCount={ctx.all.length}
            unreadCount={ctx.unreadCount}
            onTap={setTab}
            allBody={list}
            unreadBody={list}
          />
        </div>
      </div>
    </main>
  );
}
