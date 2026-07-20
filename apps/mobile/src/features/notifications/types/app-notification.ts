/** Mirrors mobile/lib/shared/types/app_notification.dart. */
export type AppNotificationKind = 'missedCall' | 'upcomingCall' | 'paymentReceived' | 'system';

export interface AppNotification {
  id: string;
  kind: AppNotificationKind;
  title: string;
  message: string;
  /** Display-formatted timestamp, e.g. 'Today', '3 hours ago', '21 Feb. 2024'. */
  timeLabel: string;
  read: boolean;
  /** Absolute route to navigate to when tapped. When undefined, tapping only marks as read. */
  route?: string;
}

export function appNotificationNavigatesToDetail(n: AppNotification): boolean {
  return n.route !== undefined;
}
