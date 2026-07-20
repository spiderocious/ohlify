import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppIcon, AppIconButton, AppText, AppTextAreaInput, colors, showToast } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import { callsApi } from '@features/calls/api/calls-api';
import { StarRow } from './parts/star-row';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'CallRating'>;

/**
 * Shown after a call ends and feedback is submitted. Asks the user to rate
 * the professional they spoke to. Skippable. Mirrors mobile/lib/features/
 * call_session/screen/call_rating_screen.dart.
 */
export function CallRatingScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteType>();
  const { peerName, callId } = route.params;

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function exit() {
    navigation.navigate('Home');
  }

  async function submit() {
    if (stars === 0 || submitting) return;
    if (!callId) {
      showToast(`Thanks for rating ${peerName}`, { type: 'success' });
      exit();
      return;
    }
    setSubmitting(true);
    try {
      await callsApi.submitRating({ callId, stars, comment: comment.trim() || undefined });
      showToast(`Thanks for rating ${peerName}`, { type: 'success' });
      exit();
    } catch (e) {
      showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <AppIconButton icon={<AppIcon name="back" size={20} color={colors.textJet} />} variant="ghost" backgroundColor={colors.surfaceLight} size={44} onPress={exit} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={exit} style={{ padding: 8 }}>
          <AppText variant="body" color={colors.textMuted} weight="500" align="right">
            Not now
          </AppText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <AppText variant="title" color={colors.textJet} weight="800" align="left">
          Rate this call
        </AppText>
        <View style={{ height: 6 }} />
        <AppText variant="body" color={colors.textMuted} align="left">
          {`How was your conversation with ${peerName}?`}
        </AppText>
        <View style={{ height: 24 }} />
        <StarRow value={stars} onChange={setStars} />
        <View style={{ height: 24 }} />
        <AppText variant="bodyNormal" color={colors.textMuted} align="left">
          Leave a comment (optional)
        </AppText>
        <View style={{ height: 8 }} />
        <AppTextAreaInput value={comment} onChangeText={setComment} placeholder="Share what you liked, or how they could improve…" maxLength={500} />
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <AppButton label="Submit rating" expanded radius={100} isDisabled={stars === 0} onPress={stars === 0 ? undefined : submit} />
      </View>
    </View>
  );
}
