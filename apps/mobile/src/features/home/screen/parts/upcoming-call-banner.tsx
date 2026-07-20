import { AppButton, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { Text, View } from 'react-native';

/** Mirrors mobile/lib/features/home/screen/parts/upcoming_call_banner.dart. */
export interface UpcomingCallBannerProps {
  calleeName: string;
  scheduledTime: string;
  onJoin: () => void;
}

export function UpcomingCallBanner({ calleeName, scheduledTime, onJoin }: UpcomingCallBannerProps) {
  return (
    <View style={{ padding: 16, backgroundColor: colors.secondary, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name="person" size={40} color={colors.textMuted} />
      </View>
      <View style={{ width: 16 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" align="left" color={colors.textJet} numberOfLines={2}>
          {`Meeting with\n${calleeName}`}
        </AppText>
        <View style={{ height: 6 }} />
        <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 14, color: colors.textMuted }}>
          Starting in <Text style={{ fontFamily: 'MonaSans-Bold', fontWeight: '700', color: colors.textJet }}>{scheduledTime}</Text>
        </Text>
      </View>
      <View style={{ width: 12 }} />
      <AppButton label="Join meeting" onPress={onJoin} width={120} height={48} radius={100} textStyle={{ fontSize: 14 }} />
    </View>
  );
}
