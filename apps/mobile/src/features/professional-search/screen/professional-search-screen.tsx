import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppIcon, AppIconButton, AppSearchBar, AppText, colors } from '@ohlify/mobile-ui';
import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import { useProfessionalsSearch } from '@features/professionals/providers/use-professionals-search';
import type { Professional } from '@features/professionals/types/professional';
import { SearchResultsList } from './parts/search-results-list';
import { SortFilter, type SortOption } from './parts/sort-filter';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'Professionals'>;

/** Mirrors mobile/lib/features/professional_search/screen/professional_search_screen.dart. */
export function ProfessionalSearchScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteType>();
  const initialCategory = route.params?.category;
  const autofocus = route.params?.focus ?? false;

  const search = useProfessionalsSearch(initialCategory);
  const [sort, setSort] = useState<SortOption>({ key: 'rating', direction: 'desc' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const results = useMemo(
    (): Professional[] =>
      search.items.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        rating: p.rating,
        reviewCount: p.reviewCount,
        avatarUrl: p.avatarKey,
        basePrice: p.basePriceKobo === undefined ? undefined : Math.round(p.basePriceKobo / 100),
      })),
    [search.items],
  );

  function handleSortChange(opt: SortOption) {
    setSort(opt);
    search.setSort(opt.key, opt.direction);
  }

  async function refresh() {
    setIsRefreshing(true);
    try {
      await search.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  function goToDetails(pro: Professional) {
    navigation.navigate('Professional', { professionalId: pro.id });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center' }}>
        <AppIconButton icon={<AppIcon name="back" size={20} color={colors.textJet} />} variant="ghost" backgroundColor={colors.background} size={44} onPress={() => navigation.goBack()} />
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}>
          <AppSearchBar placeholder="Search professional" autoFocus={autofocus} value={search.query} onChangeText={search.setQuery} />
        </View>
      </View>
      <View style={{ height: 16 }} />
      <View style={{ paddingHorizontal: 16 }}>
        <SortFilter value={sort} onChange={handleSortChange} />
      </View>
      <View style={{ height: 16 }} />
      <View style={{ flex: 1 }}>
        {search.isLoadingInitial ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : search.error && search.items.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <AppText variant="body" color={colors.textMuted} align="center">
              {apiErrorMessage(search.error instanceof ApiError ? search.error : ApiError.network)}
            </AppText>
            <View style={{ height: 12 }} />
            <AppButton label="Try again" radius={100} onPress={search.refresh} />
          </View>
        ) : search.items.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="body" color={colors.textMuted} align="center">
              No professionals found.
            </AppText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
          >
            <SearchResultsList professionals={results} onTap={goToDetails} onSchedule={goToDetails} />
            {search.hasMore ? (
              <>
                <View style={{ height: 16 }} />
                <AppButton
                  label={search.isFetching ? 'Loading…' : 'Load more'}
                  expanded
                  radius={100}
                  variant="outline"
                  isDisabled={search.isFetching}
                  onPress={search.isFetching ? undefined : search.loadMore}
                />
              </>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
