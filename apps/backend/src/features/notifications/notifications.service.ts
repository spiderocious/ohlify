import type { PoolClient } from 'pg';

import * as chatRepo from '@features/chat/chat.repo.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { publish, RealtimeEvent } from '@lib/realtime/index.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { NOTIFICATION_MESSAGES } from './notifications.messages.js';
import * as repo from './notifications.repo.js';
import type {
  BadgeSurface,
  BadgesView,
  NotificationRow,
  NotificationView,
} from './notifications.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

const toView = (row: NotificationRow): NotificationView => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  body: row.body,
  deeplink: row.deeplink,
  metadata: row.metadata,
  read: row.read_at !== null,
  created_at: row.created_at.toISOString(),
});

/**
 * Writes a panel row and signals the owner.
 *
 * Takes a transaction runner so the notification commits with whatever caused
 * it — a rejected withdrawal that rolls back must not leave a notice about a
 * rejection that never happened. The realtime hint fires after, and is
 * best-effort: a lost signal costs a delayed refresh, not the row.
 */
export const notify = async (
  runner: QueryRunner,
  input: repo.CreateNotificationInput,
): Promise<NotificationRow | null> => {
  const row = await repo.create(runner, input);
  // Null means an outbox retry hit a row we already wrote. Re-publishing would
  // flash a "new notification" badge for something the user has already seen,
  // so a duplicate is silently dropped.
  if (row === null) return null;
  publish(input.userId, { type: RealtimeEvent.NOTIFICATION_NEW, data: { id: row.id } });
  publish(input.userId, { type: RealtimeEvent.BADGES_CHANGED });
  return row;
};

export const listMine = async (userId: string, limit: number | undefined, cursorRaw?: string) => {
  const lim = resolveLimit(limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (cursorRaw !== undefined) {
    try {
      cursor = decodeCursor(cursorRaw);
    } catch {
      return new ServiceError('validation_error', NOTIFICATION_MESSAGES.LISTED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }

  const rows = await repo.listForUser(userId, lim + 1, cursor);
  const hasMore = rows.length > lim;
  const page = hasMore ? rows.slice(0, lim) : rows;
  const last = page[page.length - 1];

  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: {
        next_cursor:
          hasMore && last
            ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
            : null,
        has_more: hasMore,
      },
    },
    NOTIFICATION_MESSAGES.LISTED,
  );
};

export const markRead = async (userId: string, notificationId: string) => {
  const updated = await repo.markRead(userId, notificationId);
  if (!updated) {
    return new ServiceError('not_found', NOTIFICATION_MESSAGES.NOT_FOUND, 404);
  }
  publish(userId, { type: RealtimeEvent.BADGES_CHANGED });
  return new ServiceSuccess({ id: notificationId, read: true }, NOTIFICATION_MESSAGES.MARKED_READ);
};

export const markAllRead = async (userId: string) => {
  const count = await repo.markAllRead(userId);
  publish(userId, { type: RealtimeEvent.BADGES_CHANGED });
  return new ServiceSuccess({ marked: count }, NOTIFICATION_MESSAGES.MARKED_READ);
};

/**
 * Everything the tab bar needs, in one read.
 *
 * One endpoint rather than four, because four would become four polling loops
 * the moment the client wanted them fresh.
 */
export const getBadges = async (userId: string) => {
  const [chatsUnread, notificationsUnread, dots] = await Promise.all([
    chatRepo.totalUnreadForUser(userId),
    repo.countUnread(userId),
    repo.readDotSurfaces(userId),
  ]);

  const view: BadgesView = {
    chats_unread: chatsUnread,
    notifications_unread: notificationsUnread,
    calls_unseen: dots.callsUnseen,
    wallet_unseen: dots.walletUnseen,
  };
  return new ServiceSuccess(view, NOTIFICATION_MESSAGES.BADGES_FETCHED);
};

/** Clears a dot by moving that surface's watermark to now. */
export const markSurfaceSeen = async (userId: string, surface: BadgeSurface) => {
  await repo.touchSurfaceSeen(userId, surface);
  publish(userId, { type: RealtimeEvent.BADGES_CHANGED });
  return new ServiceSuccess({ surface, seen: true }, NOTIFICATION_MESSAGES.SURFACE_SEEN);
};
