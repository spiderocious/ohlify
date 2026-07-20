import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppSearchBar, AppText, colors } from '@ohlify/mobile-ui';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import type { MainTabParamList } from '../../../main-tabs.navigation';
import { useHome } from '@features/home/api/use-home';
import { CategoryFilter } from './parts/category-filter';
import { PopularProfessionalsList } from './parts/popular-professionals-list';
import { UpcomingCallBanner } from './parts/upcoming-call-banner';
import { UpcomingCallsList } from './parts/upcoming-calls-list';
import type { CategoryItem, ProfessionalListItem, UpcomingCallItem } from '../types/home-models';

type TabNavigation = BottomTabNavigationProp<MainTabParamList>;
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Mirrors mobile/lib/features/home/screen/home_screen.dart. */
export function HomeScreen() {
  const navigation = useNavigation<TabNavigation>();
  const home = useHome();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categories = useMemo(() => home.data?.categories.slice(0, 5) ?? [], [home.data]);

  async function refresh() {
    setIsRefreshing(true);
    try {
      await home.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  const root = navigation.getParent<RootNavigation>();

  function gotoSearch(params?: { category?: string; focus?: boolean }) {
    root?.navigate('Professionals', { focus: params?.focus, category: params?.category });
  }

  const hasError = home.isError && !home.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      {home.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : hasError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <AppText variant="body" color={colors.textMuted} align="center">
            {apiErrorMessage(home.error instanceof ApiError ? home.error : ApiError.network)}
          </AppText>
          <View style={{ height: 12 }} />
          <Pressable onPress={() => home.refetch()}>
            <AppText variant="body" color={colors.primary} weight="600" align="center">
              Try again
            </AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        >
          <View style={{ height: 20 }} />
          <AppSearchBar readOnly onPress={() => gotoSearch({ focus: true })} />
          {home.data?.activeMeeting ? (
            <>
              <View style={{ height: 16 }} />
              <UpcomingCallBanner
                calleeName={home.data.activeMeeting.peerName}
                scheduledTime="Now"
                onJoin={() => root?.navigate('Call', { callId: home.data!.activeMeeting!.callId })}
              />
            </>
          ) : null}
          <View style={{ height: 24 }} />
          <UpcomingCallsList
            calls={(home.data?.upcomingCalls ?? []).map(toUpcomingCallCard)}
            onViewAll={() => navigation.navigate('CallsTab')}
            onPress={(call) => root?.navigate('Call', { callId: call.id })}
          />
          <View style={{ height: 24 }} />
          <CategoryFilter categories={categories} onChange={(c: CategoryItem) => gotoSearch({ category: c.value })} />
          <View style={{ height: 24 }} />
          <PopularProfessionalsList
            professionals={home.data?.popularProfessionals ?? []}
            onViewAll={() => root?.navigate('Professionals', undefined)}
            onSchedule={(pro: ProfessionalListItem) => root?.navigate('Professional', { professionalId: pro.id })}
            onPress={(pro: ProfessionalListItem) => root?.navigate('Professional', { professionalId: pro.id })}
          />
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

function toUpcomingCallCard(c: UpcomingCallItem) {
  return {
    id: c.id,
    name: c.peerName,
    role: c.callType === 'video' ? 'Video call' : 'Audio call',
    rating: 0,
    reviewCount: 0,
    avatarKey: c.peerAvatarKey,
  };
}

