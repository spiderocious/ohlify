import { colors, Skeleton } from '@ohlify/mobile-ui';
import { View } from 'react-native';

/** Loading placeholder for the conversation list — white cards matching
 * ConversationCard's silhouette (50px avatar + name/preview lines + time). */
function ConversationCardSkeleton() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 22,
        backgroundColor: colors.background,
        shadowColor: '#3D3A6E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 1,
      }}
    >
      <Skeleton width={54} height={54} borderRadius={27} />
      <View style={{ width: 13 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton height={14} width="45%" />
          <View style={{ flex: 1 }} />
          <Skeleton height={11} width={32} />
        </View>
        <View style={{ height: 9 }} />
        <Skeleton height={12} width="75%" />
      </View>
    </View>
  );
}

export function ConversationListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 2, gap: 10 }}>
      {Array.from({ length: count }, (_, i) => (
        <ConversationCardSkeleton key={i} />
      ))}
    </View>
  );
}
