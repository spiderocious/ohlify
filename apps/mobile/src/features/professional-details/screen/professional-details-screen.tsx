import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppText, colors, ProfessionalHeader, showToast } from '@ohlify/mobile-ui';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { fileService } from '@shared/services/file-service';

import type { RootStackParamList } from '../../../app.navigation';
import { chatApi } from '@features/chat/api/chat-api';
import { instantCallsApi } from '@features/instant-calls/api/instant-calls-api';
import { professionalsApi } from '@features/professionals/api/professionals-api';
import type { ProfessionalDetail, ProfessionalRateView, ReviewItem } from '@features/professionals/types/professional-models';
import type { Professional } from '@features/professionals/types/professional';
import type { ProfessionalRate } from '@features/professionals/types/professional-rate';
import type { Review } from '@features/professionals/types/review';
import { BuyMinutesSection } from './parts/buy-minutes-section';
import { DescriptionSection } from './parts/description-section';
import { RatesSection } from './parts/rates-section';
import { ReviewsSection } from './parts/reviews-section';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'Professional'>;

function formatKobo(kobo: number): string {
  const naira = Math.round(kobo / 100);
  const s = naira.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  return `₦ ${s}`;
}

function toProRate(r: ProfessionalRateView): ProfessionalRate {
  return {
    callType: r.callType === 'video' ? 'video' : 'audio',
    durationMinutes: r.durationMinutes,
    price: formatKobo(r.priceKobo),
    pricePerMinute: r.pricePerMinuteKobo === undefined ? undefined : `${formatKobo(r.pricePerMinuteKobo)} / min`,
  };
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays > 30) return `${Math.floor(diffDays / 30)} months ago`;
  if (diffDays > 0) return `${diffDays} days ago`;
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours > 0) return `${diffHours} hours ago`;
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes > 0) return `${diffMinutes} minutes ago`;
  return 'just now';
}

function toReview(r: ReviewItem): Review {
  return {
    id: r.id,
    authorName: r.reviewerName,
    rating: r.rating,
    comment: r.comment ?? '',
    timeAgo: timeAgo(r.createdAt),
    authorAvatarUrl: r.reviewerAvatarKey,
  };
}

/** Three-query screen — pro detail + rates + first page of reviews. Mirrors mobile/lib/features/professional_details/screen/professional_details_screen.dart. */
export function ProfessionalDetailsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteType>();
  const { professionalId } = route.params;

  const [detail, setDetail] = useState<ProfessionalDetail | undefined>(undefined);
  const [detailError, setDetailError] = useState<ApiError | undefined>(undefined);
  const [detailLoading, setDetailLoading] = useState(true);
  const [rates, setRates] = useState<ProfessionalRateView[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    professionalsApi
      .getById(professionalId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setDetailError(e instanceof ApiError ? e : ApiError.network);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    professionalsApi
      .getRates(professionalId)
      .then((r) => {
        if (!cancelled) setRates(r);
      })
      .catch(() => undefined);
    professionalsApi
      .getReviews(professionalId)
      .then((page) => {
        if (!cancelled) setReviews(page.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [professionalId]);

  async function startCall() {
    if (calling) return;
    setCalling(true);
    const proRates = rates.map(toProRate);
    const hasVideo = proRates.some((r) => r.callType === 'video');
    const callType = hasVideo ? 'video' : 'audio';
    try {
      await instantCallsApi.start({ professionalId, callType });
      showToast('Calling…', { type: 'success' });
    } catch (e) {
      const error = e instanceof ApiError ? e : ApiError.network;
      showToast(error.reason === 'insufficient_balance' ? 'You don’t have minutes with this professional. Buy minutes to call.' : apiErrorMessage(error), { type: 'error' });
    } finally {
      setCalling(false);
    }
  }

  async function openChat() {
    try {
      const conversationId = await chatApi.openConversation(professionalId);
      navigation.navigate('Home', { screen: 'ChatsTab', params: { screen: 'ChatThread', params: { conversationId } } });
    } catch (e) {
      const error = e instanceof ApiError ? e : ApiError.network;
      showToast(error.reason === 'forbidden' ? 'Buy minutes with this professional to start chatting.' : apiErrorMessage(error), { type: 'error' });
    }
  }

  const scrollRef = useRef<ScrollView | null>(null);

  if (detailLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (detailError && !detail) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight, padding: 24 }}>
        <AppText variant="body" color={colors.textMuted} align="center">
          {apiErrorMessage(detailError)}
        </AppText>
      </View>
    );
  }

  if (!detail) return null;

  const professional: Professional = {
    id: detail.id,
    name: detail.name,
    role: detail.role,
    rating: detail.rating,
    reviewCount: detail.reviewCount,
    avatarUrl: detail.coverPhotoKey ?? detail.avatarKey,
  };
  const proRates = rates.map(toProRate);
  const reviewItems = reviews.map(toReview);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <ScrollView ref={scrollRef}>
        <ProfessionalHeader
          professional={professional}
          resolveUri={fileService.mintViewUri}
          onBack={() => navigation.goBack()}
          onReviewsTap={() => scrollRef.current?.scrollToEnd({ animated: true })}
        />
        <View style={{ height: 16 }} />
        <View style={{ paddingHorizontal: 16 }}>
          <DescriptionSection description={detail.description ?? 'No description yet.'} />
        </View>
        <View style={{ height: 20 }} />
        <View style={{ paddingHorizontal: 16 }}>
          <RatesSection rates={proRates} />
        </View>
        <View style={{ height: 20 }} />
        <View style={{ paddingHorizontal: 16 }}>
          <BuyMinutesSection professionalId={professionalId} rates={proRates} />
        </View>
        <View style={{ height: 20 }} />
        <View style={{ paddingHorizontal: 16 }}>
          <ReviewsSection reviews={reviewItems} />
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: colors.surfaceLight, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ flex: 1 }}>
          <AppButton label="Message" onPress={openChat} radius={100} height={52} variant="outline" expanded />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <AppButton label="Call" onPress={startCall} radius={100} height={52} isDisabled={calling} expanded />
        </View>
      </View>
    </View>
  );
}
