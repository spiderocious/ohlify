import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppSearchBar, AppText, colors } from '@ohlify/mobile-ui';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { queryKeys } from '@shared/api/query-keys';
import { RefreshStatusLine } from '@shared/parts/refresh-status-line';
import { BannerPlacement } from '@features/banners/api/use-banner';
import { BannerSlot } from '@features/banners/screen/banner-slot';

import type { RootStackParamList } from '../../../app.navigation';
import type { MainTabParamList } from '../../../main-tabs.navigation';
import { useHome } from '@features/home/api/use-home';
import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { CategoryFilter } from './parts/category-filter';
import { ContinueWithList } from './parts/continue-with-list';
import { ProfessionalHomeScreen } from './professional-home-screen';
import { PopularProfessionalsList } from './parts/popular-professionals-list';
import type { CategoryItem, ProfessionalListItem } from '../types/home-models';

type TabNavigation = BottomTabNavigationProp<MainTabParamList>;
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Mirrors mobile/lib/features/home/screen/home_screen.dart. */
/**
 * Routes to whichever home the caller actually needs.
 *
 * A professional has no use for a search bar full of people like themselves,
 * and a client has no earnings to see — so these are two screens, not one
 * screen with branches sprinkled through it.
 */
export function HomeScreen() {
  const { isProfessional } = useAuthSession();
  return isProfessional ? <ProfessionalHomeScreen /> : <ClientHomeScreen />;
}

function ClientHomeScreen() {
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
      {/* `data === undefined` rather than `isLoading`: offlineFirst keeps
          isLoading true through the whole retry sequence, hiding cached content
          behind a spinner. Same fix as chats-screen. */}
      {home.data === undefined && home.isFetching ? (
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
          <RefreshStatusLine queryKey={queryKeys.home()} />
          <BannerSlot placement={BannerPlacement.HOME} />
          <View style={{ height: 12 }} />
          <ContinueWithList
            items={home.data?.continueWith ?? []}
            onPress={(item) => root?.navigate('Professional', { professionalId: item.professionalId })}
          />
          {(home.data?.continueWith.length ?? 0) > 0 ? <View style={{ height: 22 }} /> : null}
          <AppSearchBar readOnly onPress={() => gotoSearch({ focus: true })} />
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

