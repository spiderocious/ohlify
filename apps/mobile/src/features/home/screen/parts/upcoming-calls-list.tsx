import { AppFilePreview, AppSvg, AppText, colors } from '@ohlify/mobile-ui';
import { Pressable, ScrollView, View } from 'react-native';

import { fileService } from '@shared/services/file-service';

/**
 * Simplified upcoming-call shape rendered by this card list — the caller
 * (home-screen.tsx) maps the raw UpcomingCallItem into this. Mirrors
 * mobile/lib/features/home/screen/parts/upcoming_calls_list.dart.
 */
export interface UpcomingCallCardData {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  avatarKey?: string;
}

export interface UpcomingCallsListProps {
  calls: UpcomingCallCardData[];
  onViewAll: () => void;
  onPress: (call: UpcomingCallCardData) => void;
}

export function UpcomingCallsList({ calls, onViewAll, onPress }: UpcomingCallsListProps) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="body" color={colors.textMuted} align="left">
          Upcoming calls
        </AppText>
        <Pressable onPress={onViewAll}>
          <AppText variant="body" color={colors.textBlack} weight="500" align="left">
            View all
          </AppText>
        </Pressable>
      </View>
      <View style={{ height: 16 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row' }}>
          {calls.map((call, i) => (
            <View key={call.id} style={{ marginRight: i < calls.length - 1 ? 12 : 0 }}>
              <UpcomingCallCard call={call} onPress={() => onPress(call)} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function UpcomingCallCard({ call, onPress }: { call: UpcomingCallCardData; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={{ width: 180, padding: 12, backgroundColor: colors.background, borderRadius: 20, alignItems: 'center' }}>
        <AppFilePreview fileKey={call.avatarKey} resolveUri={fileService.mintViewUri} width={100} height={100} borderRadius={18} />
        <View style={{ height: 16 }} />
        <AppText variant="body" color={colors.textNavy} align="center" numberOfLines={1}>
          {call.name}
        </AppText>
        <View style={{ height: 1 }} />
        <AppText variant="bodyNormal" color={colors.textMuted} align="center" weight="500" numberOfLines={1}>
          {call.role}
        </AppText>
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppSvg name="ratingBadge" size={18} />
          <View style={{ width: 4 }} />
          <AppText variant="body" color={colors.textAmber} weight="500" align="left">
            {String(call.rating)}
          </AppText>
          <View style={{ width: 4 }} />
          <AppText variant="bodyNormal" color={colors.textMuted} weight="400" align="left">
            {`(${call.reviewCount} Reviews)`}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}
