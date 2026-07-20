import { AppText, colors } from '@ohlify/mobile-ui';
import { Pressable, Text, View } from 'react-native';

export interface NotificationsTabsProps {
  activeIndex: number;
  unreadCount: number;
  onTap: (index: number) => void;
}

/** Mirrors mobile/lib/features/notifications/screen/parts/notifications_tabs.dart. */
export function NotificationsTabs({ activeIndex, unreadCount, onTap }: NotificationsTabsProps) {
  return (
    <View style={{ flexDirection: 'row', padding: 4, backgroundColor: colors.surfaceLight, borderRadius: 14 }}>
      <Tab label="All" count={undefined} active={activeIndex === 0} onTap={() => onTap(0)} />
      <Tab label="Unread" count={unreadCount} active={activeIndex === 1} onTap={() => onTap(1)} />
    </View>
  );
}

function Tab({ label, count, active, onTap }: { label: string; count?: number; active: boolean; onTap: () => void }) {
  return (
    <Pressable onPress={onTap} style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 12,
          borderRadius: 10,
          backgroundColor: active ? colors.background : 'transparent',
          shadowColor: '#000',
          shadowOpacity: active ? 0.06 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: active ? 2 : 0,
        }}
      >
        <AppText variant="body" color={active ? colors.textJet : colors.textMuted} weight={active ? '700' : '400'} align="center">
          {label}
        </AppText>
        {count !== undefined ? (
          <>
            <View style={{ width: 8 }} />
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.border, borderRadius: 6 }}>
              <Text style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 12, fontWeight: '600', color: colors.textJet }}>{count}</Text>
            </View>
          </>
        ) : null}
      </View>
    </Pressable>
  );
}
