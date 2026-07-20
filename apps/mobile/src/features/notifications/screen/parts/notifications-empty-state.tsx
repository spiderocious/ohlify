import { AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { View } from 'react-native';

export interface NotificationsEmptyStateProps {
  message?: string;
}

/** Mirrors mobile/lib/features/notifications/screen/parts/notifications_empty_state.dart. */
export function NotificationsEmptyState({ message }: NotificationsEmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: 16, left: 22, width: 22, height: 22, borderRadius: 11, backgroundColor: '#E5E7EB' }} />
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name="notification" size={44} color="#B5B9C1" />
        </View>
      </View>
      <View style={{ height: 20 }} />
      <AppText variant="medium" color={colors.textMuted} weight="500" align="center">
        {message ?? 'No Notifications Yet'}
      </AppText>
    </View>
  );
}
