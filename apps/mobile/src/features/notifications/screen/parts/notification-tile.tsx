import { AppIcon, AppText, colors, type AppIconName } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

import { appNotificationNavigatesToDetail, type AppNotification, type AppNotificationKind } from '../../types/app-notification';

export interface NotificationTileProps {
  notification: AppNotification;
  onTap: () => void;
}

const VISUAL: Record<AppNotificationKind, { bg: string; icon: string; glyph: AppIconName }> = {
  missedCall: { bg: '#E0F2FE', icon: '#0284C7', glyph: 'notificationActive' },
  upcomingCall: { bg: '#FFEDD5', icon: '#EA580C', glyph: 'notification' },
  paymentReceived: { bg: '#E0F2FE', icon: '#0284C7', glyph: 'notificationActive' },
  system: { bg: colors.surfaceDark, icon: colors.primary, glyph: 'notification' },
};

/** Mirrors mobile/lib/features/notifications/screen/parts/notification_tile.dart. */
export function NotificationTile({ notification, onTap }: NotificationTileProps) {
  const visual = VISUAL[notification.kind];

  return (
    <Pressable onPress={onTap}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: visual.bg, alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name={visual.glyph} size={20} color={visual.icon} />
          {!notification.read ? (
            <View
              style={{
                position: 'absolute',
                top: -1,
                right: -1,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: colors.danger,
                borderWidth: 2,
                borderColor: colors.background,
              }}
            />
          ) : null}
        </View>
        <View style={{ width: 14 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" color={colors.textJet} weight="700" align="left">
            {notification.title}
          </AppText>
          <View style={{ height: 4 }} />
          <AppText variant="body" color={colors.textMuted} align="left">
            {notification.message}
          </AppText>
          <View style={{ height: 8 }} />
          <AppText variant="bodyNormal" color={colors.textSlate} align="left">
            {notification.timeLabel}
          </AppText>
        </View>
        {appNotificationNavigatesToDetail(notification) ? (
          <>
            <View style={{ width: 8 }} />
            <AppIcon name="chevronRight" size={20} color={colors.textSlate} />
          </>
        ) : null}
      </View>
    </Pressable>
  );
}
