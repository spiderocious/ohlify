import { AppButton, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { View } from 'react-native';

export interface ProfileLinkCardProps {
  profileUrl: string;
  onCopy: () => void;
}

/** Mirrors mobile/lib/features/profile/screen/parts/profile_link_card.dart. */
export function ProfileLinkCard({ profileUrl, onCopy }: ProfileLinkCardProps) {
  return (
    <View style={{ backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name="chat" size={22} color={colors.primary} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" color={colors.textJet} weight="600" align="left">
            Your personal Ohlify link
          </AppText>
          <View style={{ height: 2 }} />
          <AppText variant="label" color={colors.textMuted} align="left">
            Share your link with your community
          </AppText>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: colors.border }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
        <AppIcon name="copyLink" size={16} color={colors.textMuted} />
        <View style={{ width: 8 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" color={colors.textMuted} align="left" numberOfLines={1}>
            {profileUrl}
          </AppText>
        </View>
        <View style={{ width: 8 }} />
        <AppButton label="Copy link" variant="outline" onPress={onCopy} height={36} radius={100} textStyle={{ fontSize: 13, fontWeight: '600' }} />
      </View>
    </View>
  );
}
