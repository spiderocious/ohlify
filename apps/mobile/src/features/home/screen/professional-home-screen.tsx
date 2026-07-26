import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatSecondsAsDuration } from '@ohlify/core';
import { AnimatedBalance, AppAvatar, AppText, colors } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { usePullToRefresh } from '@shared/api/use-refresh-state';
import { RefreshStatusLine } from '@shared/parts/refresh-status-line';
import { fileService } from '@shared/services/file-service';

import type { RootStackParamList } from '../../../app.navigation';
import type { MainTabParamList } from '../../../main-tabs.navigation';
import { BannerPlacement } from '@features/banners/api/use-banner';
import { BannerSlot } from '@features/banners/screen/banner-slot';
import { formatKobo } from '@features/wallet/types/wallet-models';
import {
  proDashboardQueryKey,
  useProDashboard,
  useSetAvailability,
  type ProRecentCall,
} from '../api/use-pro-dashboard';
import { AttentionRow } from './parts/attention-row';
import { AvailabilityCard } from './parts/availability-card';
import { EarningsRow } from './parts/earnings-row';
import { EarningsSparkline } from './parts/earnings-sparkline';
import { KycStatusCard } from './parts/kyc-status-card';

type TabNavigation = BottomTabNavigationProp<MainTabParamList>;
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * A professional's home.
 *
 * Deliberately not the client screen with different data. A professional's
 * questions — am I reachable, what have I earned, what needs me — have nothing
 * to do with discovery, and showing them a search bar for people like
 * themselves was never going to be right.
 */
export function ProfessionalHomeScreen() {
  const navigation = useNavigation<TabNavigation>();
  const root = navigation.getParent<RootNavigation>();
  const [days, setDays] = useState<7 | 30>(7);

  const dashboard = useProDashboard(days, true);
  const availability = useSetAvailability(days);
  const { isRefreshing, onRefresh } = usePullToRefresh(proDashboardQueryKey(days));

  if (dashboard.isLoading && !dashboard.data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const data = dashboard.data;

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => void onRefresh()} />
      }
    >
      <RefreshStatusLine queryKey={proDashboardQueryKey(days)} />
      <BannerSlot placement={BannerPlacement.HOME} />
      <View style={{ height: 8 }} />

      <AvailabilityCard
        isAvailable={data?.isAvailable ?? false}
        isSaving={availability.isPending}
        onChange={(next) => availability.mutate(next)}
      />

      {data && data.kycStatus !== 'approved' ? (
        <>
          <View style={{ height: 14 }} />
          <KycStatusCard
            status={data.kycStatus}
            rejectReason={data.kycRejectReason}
            onFix={() => root?.navigate('ProfessionalKyc')}
          />
        </>
      ) : null}

      <View style={{ height: 14 }} />
      <EarningsRow
        todayKobo={data?.earnings.todayKobo ?? 0}
        weekKobo={data?.earnings.weekKobo ?? 0}
        withdrawableKobo={data?.earnings.withdrawableKobo ?? 0}
        onWithdraw={() => navigation.navigate('WalletTab')}
      />

      {data ? (
        <>
          <View style={{ height: 14 }} />
          <AttentionRow
            unreadMessages={data.attention.unreadMessages}
            pendingSchedules={data.attention.pendingSchedules}
            missedCallsToday={data.attention.missedCallsToday}
            onMessages={() => navigation.navigate('ChatsTab')}
            onCalls={() => navigation.navigate('CallsTab')}
          />
        </>
      ) : null}

      <View style={{ height: 14 }} />
      <EarningsSparkline series={data?.series ?? []} days={days} onDaysChange={setDays} />

      <View style={{ height: 20 }} />
      <AppText variant="body" weight="700" color={colors.textJet} align="left">
        Recent calls
      </AppText>
      <View style={{ height: 8 }} />
      {(data?.recentCalls.length ?? 0) === 0 ? (
        <AppText variant="bodySmall" color={colors.textMuted} align="left">
          Calls you take will show up here, with what you earned from each.
        </AppText>
      ) : (
        data?.recentCalls.map((call) => (
          <RecentCallRow
            key={call.id}
            call={call}
            onPress={() => root?.navigate('Call', { callId: call.id })}
          />
        ))
      )}
    </ScrollView>
  );
}

function RecentCallRow({ call, onPress }: { call: ProRecentCall; onPress: () => void }) {
  const missed = call.status === 'missed' || call.status === 'cancelled';

  return (
    <Pressable onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
        <AppAvatar
          fileKey={call.peerAvatarKey}
          resolveUri={fileService.mintViewUri}
          name={call.peerName ?? 'Client'}
          size={38}
        />
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="600" color={colors.textJet} align="left" numberOfLines={1}>
            {call.peerName ?? 'Client'}
          </AppText>
          <AppText variant="bodySmall" color={missed ? colors.error : colors.textMuted} align="left">
            {missed
              ? call.status === 'missed'
                ? 'Missed'
                : 'Cancelled'
              : formatSecondsAsDuration(call.connectedSeconds)}
          </AppText>
        </View>
        {/* Per-call earnings — scramble §7, without needing its own screen. */}
        {call.earnedKobo > 0 ? (
          <AnimatedBalance
            value={call.earnedKobo}
            format={(v) => formatKobo(v)}
            variant="body"
            weight="700"
            color={colors.success}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
