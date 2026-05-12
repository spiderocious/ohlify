export type AppNotificationKind = 'missedCall' | 'upcomingCall' | 'paymentReceived' | 'system';

export interface AppNotification {
  id: string;
  kind: AppNotificationKind;
  title: string;
  message: string;
  /** Display-formatted timestamp, e.g. "Today", "3 hours ago", "21 Feb. 2024". */
  timeLabel: string;
  read: boolean;
  /** Absolute web route. When set, tapping deeplinks; when null, tap only marks read. */
  route?: string;
}

export const navigatesToDetail = (n: AppNotification): boolean => Boolean(n.route);
