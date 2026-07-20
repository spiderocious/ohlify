import { View } from 'react-native';

import { Skeleton, SkeletonLines } from './skeleton';

/** Matches ProfessionalListTile's shape (80x80 avatar, radius 20 card). */
export function ProfessionalCardSkeleton() {
  return (
    <View style={{ padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
      <Skeleton width={80} height={80} borderRadius={16} />
      <View style={{ width: 14 }} />
      <View style={{ flex: 1 }}>
        <Skeleton height={14} width="70%" />
        <View style={{ height: 6 }} />
        <Skeleton height={12} width="45%" />
        <View style={{ height: 10 }} />
        <Skeleton height={12} width="35%" />
      </View>
    </View>
  );
}

/** Stacks N ProfessionalCardSkeletons — drop-in for any professional list's loading state. */
export function ProfessionalListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ marginTop: i > 0 ? 12 : 0 }}>
          <ProfessionalCardSkeleton />
        </View>
      ))}
    </View>
  );
}

/** Matches wallet transaction row shape — leading icon circle + two text lines + trailing amount. */
export function TransactionRowSkeleton() {
  return (
    <View style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <Skeleton height={13} width="55%" />
        <View style={{ height: 6 }} />
        <Skeleton height={11} width="35%" />
      </View>
      <View style={{ width: 12 }} />
      <Skeleton height={13} width={60} />
    </View>
  );
}

export function TransactionHistorySkeleton({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <TransactionRowSkeleton key={i} />
      ))}
    </View>
  );
}

/** Matches a chat bubble shape — alternating left/right alignment. */
export function ChatBubbleSkeleton({ mine = false }: { mine?: boolean }) {
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <Skeleton width={mine ? 140 : 190} height={36} borderRadius={16} />
    </View>
  );
}

export function ChatThreadSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      <ChatBubbleSkeleton />
      <ChatBubbleSkeleton mine />
      <ChatBubbleSkeleton />
      <ChatBubbleSkeleton mine />
    </View>
  );
}

/** Matches NotificationTile shape — leading icon circle + title/subtitle. */
export function NotificationTileSkeleton() {
  return (
    <View style={{ paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-start' }}>
      <Skeleton width={36} height={36} borderRadius={18} />
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <SkeletonLines count={2} lineHeight={12} gap={6} lastLineWidth="80%" />
      </View>
    </View>
  );
}

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <NotificationTileSkeleton key={i} />
      ))}
    </View>
  );
}

/** Professional details page — header block + rate cards + description lines. */
export function ProfessionalDetailsSkeleton() {
  return (
    <View>
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Skeleton width={96} height={96} borderRadius={48} />
        <View style={{ height: 14 }} />
        <Skeleton height={16} width={160} />
        <View style={{ height: 8 }} />
        <Skeleton height={12} width={100} />
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <SkeletonLines count={3} lastLineWidth="80%" />
        <View style={{ height: 20 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton height={72} style={{ flex: 1 }} borderRadius={14} />
          <Skeleton height={72} style={{ flex: 1 }} borderRadius={14} />
        </View>
      </View>
    </View>
  );
}
