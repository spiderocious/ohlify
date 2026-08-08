import { View } from 'react-native';

import { colors } from '../../theme/colors';
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
/**
 * Traces professional-details-screen.tsx exactly: the 300pt full-bleed cover
 * header (not a centred avatar — the real screen has no such thing), then
 * description, rates, buy-minutes and reviews sections at 16pt horizontal
 * padding with the same 16/20/20/20 gaps, and the pinned "Talk to …" bar.
 *
 * The point of matching is that nothing jumps when the data lands. Keep this in
 * step with that screen — a skeleton that has drifted is worse than none,
 * because it promises a layout the app then rearranges.
 */
export function ProfessionalDetailsSkeleton() {
  return (
    <View style={{ flex: 1 }}>
      {/* Cover header — ProfessionalHeader's default height is 300. */}
      <Skeleton width="100%" height={300} borderRadius={0} />

      <View style={{ height: 16 }} />
      {/* DescriptionSection */}
      <View style={{ paddingHorizontal: 16 }}>
        <Skeleton height={18} width={120} />
        <View style={{ height: 12 }} />
        <SkeletonLines count={3} lastLineWidth="70%" />
      </View>

      <View style={{ height: 20 }} />
      {/* RatesSection */}
      <View style={{ paddingHorizontal: 16 }}>
        <Skeleton height={18} width={90} />
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton height={72} style={{ flex: 1 }} borderRadius={14} />
          <Skeleton height={72} style={{ flex: 1 }} borderRadius={14} />
        </View>
      </View>

      <View style={{ height: 20 }} />
      {/* BuyMinutesSection — one MinuteRow per call type, each a label block
          on the left and a fixed 40pt "Buy" pill on the right. */}
      <View style={{ paddingHorizontal: 16 }}>
        <Skeleton height={18} width={110} />
        <View style={{ height: 12 }} />
        {[0, 1].map((row) => (
          <View
            key={row}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
          >
            <View style={{ flex: 1 }}>
              <Skeleton height={15} width="55%" />
              <View style={{ height: 6 }} />
              <Skeleton height={12} width="35%" />
            </View>
            <Skeleton width={78} height={40} borderRadius={100} />
          </View>
        ))}
      </View>

      <View style={{ height: 20 }} />
      {/* ReviewsSection */}
      <View style={{ paddingHorizontal: 16 }}>
        <Skeleton height={18} width={100} />
        <View style={{ height: 12 }} />
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: 'row', paddingVertical: 10 }}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Skeleton height={14} width="45%" />
              <View style={{ height: 8 }} />
              <SkeletonLines count={2} lastLineWidth="60%" />
            </View>
          </View>
        ))}
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />
      {/* Pinned CTA bar. */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Skeleton height={52} borderRadius={100} />
      </View>
    </View>
  );
}
