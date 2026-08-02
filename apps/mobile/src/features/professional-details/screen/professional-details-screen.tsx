import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CallType } from '@ohlify/core';
import { AppButton, AppText, colors, ProfessionalHeader, showToast } from '@ohlify/mobile-ui';
import { useRef } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { fileService } from '@shared/services/file-service';

import type { RootStackParamList } from '../../../app.navigation';
import { chatApi } from '@features/chat/api/chat-api';
import {
  useProfessionalDetail,
  useProfessionalRates,
  useProfessionalReviews,
} from '../api/use-professional-details';
import type { ProfessionalRateView, ReviewItem } from '@features/professionals/types/professional-models';
import type { Professional } from '@features/professionals/types/professional';
import type { ProfessionalRate } from '@features/professionals/types/professional-rate';
import type { Review } from '@features/professionals/types/review';
import { BuyMinutesSection } from './parts/buy-minutes-section';
import { DescriptionSection } from './parts/description-section';
import { RatesSection } from './parts/rates-section';
import { ReviewsSection } from './parts/reviews-section';
import { showTalkToSheet, type TalkToOption } from './parts/talk-to-sheet';
import { secondsHeldFor, useMyBalances } from '@features/minutes/api/use-my-balances';

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

  const detailQuery = useProfessionalDetail(professionalId);
  const balances = useMyBalances();
  const ratesQuery = useProfessionalRates(professionalId);
  const reviewsQuery = useProfessionalReviews(professionalId);

  const detail = detailQuery.data;
  const rates = ratesQuery.data ?? [];
  const reviews = reviewsQuery.data ?? [];

  function startCall(callType: CallType) {
    // The dial screen owns the request itself — navigating first is what makes
    // the tap feel immediate, and gives a failed call somewhere to be shown
    // besides a toast on a screen the user has already left behind.
    navigation.navigate('OutgoingCall', {
      professionalId,
      professionalName: detail?.name ?? 'Professional',
      ...(detail?.avatarKey === undefined ? {} : { professionalAvatarUrl: detail.avatarKey }),
      callType,
    });
  }

  async function openChat() {
    try {
      const conversationId = await chatApi.openConversation(professionalId);
      navigation.navigate('ChatThread', {
        conversationId,
        peerName: detail?.name,
        peerAvatarUrl: detail?.avatarKey,
        // Opens the thread ready to send rather than blank: the user came here
        // to talk, and an empty composer makes them compose a cold open first.
        draft: `Hi ${firstName}, I'd like to talk about `,
      });
    } catch (e) {
      const error = e instanceof ApiError ? e : ApiError.network;
      showToast(error.reason === 'forbidden' ? 'Buy minutes with this professional to start chatting.' : apiErrorMessage(error), { type: 'error' });
    }
  }

  const scrollRef = useRef<ScrollView | null>(null);

  if (detailQuery.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (detailQuery.isError && !detail) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight, padding: 24 }}>
        <AppText variant="body" color={colors.textMuted} align="center">
          {apiErrorMessage(detailQuery.error instanceof ApiError ? detailQuery.error : ApiError.network)}
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
  const firstName = detail.name.trim().split(/\s+/)[0] || 'them';
  // One option per call type the professional actually offers, priced at their
  // cheapest per-minute rate for it — the sheet must never show a type the pro
  // does not sell, nor a price they do not charge.
  const talkOptions: TalkToOption[] = ([CallType.AUDIO, CallType.VIDEO] as const)
    .map((callType) => {
      const cheapest = rates
        .filter((r) => r.callType === callType && r.pricePerMinuteKobo !== undefined)
        .sort((a, b) => (a.pricePerMinuteKobo ?? 0) - (b.pricePerMinuteKobo ?? 0))[0];
      return cheapest === undefined
        ? undefined
        : {
            callType,
            perMinuteLabel: `${formatKobo(cheapest.pricePerMinuteKobo ?? 0)} / min`,
            secondsHeld: secondsHeldFor(balances.data, professionalId, callType),
          };
    })
    .filter((option): option is TalkToOption => option !== undefined);

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
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: colors.surfaceLight, borderTopWidth: 1, borderTopColor: colors.border }}>
        <AppButton
          label={`Talk to ${firstName}`}
          onPress={() => showTalkToSheet(firstName, { options: talkOptions, onCall: startCall, onMessage: openChat })}
          radius={100}
          height={52}
          expanded
        />
      </View>
    </View>
  );
}
