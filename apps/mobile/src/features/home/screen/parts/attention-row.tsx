import { AppIcon, AppText, colors, type AppIconName } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

export interface AttentionRowProps {
  unreadMessages: number;
  pendingSchedules: number;
  missedCallsToday: number;
  onMessages: () => void;
  onCalls: () => void;
}

interface Item {
  icon: AppIconName;
  count: number;
  label: string;
  onPress: () => void;
}

/**
 * The few things actually waiting on the professional.
 *
 * Items with a count of zero are not rendered — a row of zeroes is noise, and
 * the whole point is that anything visible here needs doing.
 */
export function AttentionRow(props: AttentionRowProps) {
  const items: Item[] = ([
    {
      icon: 'chat',
      count: props.unreadMessages,
      label: props.unreadMessages === 1 ? 'unread message' : 'unread messages',
      onPress: props.onMessages,
    },
    {
      icon: 'clock',
      count: props.pendingSchedules,
      label: props.pendingSchedules === 1 ? 'call to confirm' : 'calls to confirm',
      onPress: props.onMessages,
    },
    {
      icon: 'phone',
      count: props.missedCallsToday,
      label: props.missedCallsToday === 1 ? 'missed call today' : 'missed calls today',
      onPress: props.onCalls,
    },
  ] satisfies Item[]).filter((item) => item.count > 0);

  if (items.length === 0) return null;

  return (
    <View style={{ padding: 16, borderRadius: 18, backgroundColor: `${colors.warning}14` }}>
      <AppText variant="bodySmall" weight="600" color={colors.textSlate} align="left">
        Needs your attention
      </AppText>
      <View style={{ height: 8 }} />
      {items.map((item, index) => (
        <Pressable key={item.icon} onPress={item.onPress}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}>
            <AppIcon name={item.icon} size={16} color={colors.warning} />
            <View style={{ width: 10 }} />
            <AppText variant="body" weight="600" color={colors.textJet} align="left">
              {item.count}
            </AppText>
            <View style={{ width: 5 }} />
            <AppText variant="body" color={colors.textMuted} align="left">
              {item.label}
            </AppText>
          </View>
          {index < items.length - 1 ? (
            <View style={{ height: 1, backgroundColor: `${colors.warning}22` }} />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
