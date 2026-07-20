import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { RootStackParamList } from '../../../app.navigation';
import { useNotifications } from '../providers/use-notifications';
import { NotificationsEmptyState } from './parts/notifications-empty-state';
import { NotificationsTabs } from './parts/notifications-tabs';
import { NotificationTile } from './parts/notification-tile';
import type { AppNotification } from '../types/app-notification';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Mirrors mobile/lib/features/notifications/screen/notifications_screen.dart. */
export function NotificationsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const notifications = useNotifications();
  const [tab, setTab] = useState(0);

  const items = tab === 0 ? notifications.all : notifications.unread;
  const canMarkAll = notifications.unreadCount > 0;

  function onTapNotification(n: AppNotification) {
    notifications.markAsRead(n.id);
    // Backend deep-link routing isn't fully specified yet — best-effort:
    // send the user Home, where they can navigate from context. Marking
    // read is the durable side effect either way.
    if (n.route) {
      navigation.navigate('Home');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppIcon name="chevronLeft" size={22} color={colors.textJet} />
          <View style={{ width: 4 }} />
          <AppText variant="body" color={colors.textJet} weight="500" align="left">
            Home
          </AppText>
        </Pressable>
        <View style={{ flex: 1 }} />
        <MarkAllButton enabled={canMarkAll} onPress={notifications.markAllAsRead} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <AppText variant="title" color={colors.textJet} weight="800" align="left">
          Notifications
        </AppText>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <NotificationsTabs activeIndex={tab} unreadCount={notifications.unreadCount} onTap={setTab} />
      </View>
      <View style={{ height: 8 }} />
      <View style={{ flex: 1 }}>
        {items.length === 0 ? (
          <NotificationsEmptyState />
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {items.map((n, i) => (
              <Fragment key={n.id}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
                <NotificationTile notification={n} onTap={() => onTapNotification(n)} />
              </Fragment>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function MarkAllButton({ enabled, onPress }: { enabled: boolean; onPress: () => void }) {
  const color = enabled ? colors.post : colors.textDisabled;
  return (
    <Pressable disabled={!enabled} onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 100,
          borderWidth: 1.2,
          borderColor: enabled ? color : colors.border,
        }}
      >
        <Text style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 14, fontWeight: '600', color }}>Mark all as read</Text>
        <View style={{ width: 6 }} />
        <AppIcon name="check" size={16} color={color} />
      </View>
    </Pressable>
  );
}
