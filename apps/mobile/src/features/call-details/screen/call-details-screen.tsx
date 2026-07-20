import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon, AppIconButton, AppText, colors, showToast } from '@ohlify/mobile-ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import type { CallDetail, CallStatus } from '@shared/types/call-detail';

import type { RootStackParamList } from '../../../app.navigation';
import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { callsApi } from '@features/calls/api/calls-api';
import type { CallHistoryItem } from '@features/calls/types/call-models';
import { CallActionButtons } from './parts/call-action-buttons';
import { CallInfoCard } from './parts/call-info-card';
import { CallParticipantHeader } from './parts/call-participant-header';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'Call'>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h24 = d.getHours();
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h12}:${m} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

function toDetail(c: CallHistoryItem): CallDetail {
  const now = Date.now();
  const startMs = new Date(c.startAt).getTime();
  const isCompleted = c.callStatus === 'completed';
  const isCancelled = c.bookingStatus.startsWith('cancelled_');
  const status: CallStatus = isCancelled ? 'missed' : isCompleted ? 'completed' : 'upcoming';
  const canJoin = !isCancelled && !isCompleted && startMs - now < 15 * 60_000 && now - startMs < 30 * 60_000;
  const canReschedule = !isCancelled && !isCompleted && startMs - now > 30 * 60_000;
  return {
    id: c.id,
    professionalId: c.peerUserId,
    name: c.peerName ?? 'Unknown',
    role: c.callType === 'video' ? 'Video call' : 'Audio call',
    rating: 0,
    callType: c.callType,
    status,
    time: formatTime(c.startAt),
    date: formatDate(c.startAt),
    duration: c.durationMinutes > 0 ? `${c.durationMinutes} mins` : c.connectedSeconds === undefined ? '—' : `${Math.round(c.connectedSeconds / 60)} mins`,
    canJoin,
    canReschedule,
    amount: c.priceKobo === undefined ? undefined : `₦${Math.round(c.priceKobo / 100)}`,
    avatarKey: c.peerAvatarKey,
  };
}

/**
 * Single-call detail screen — fetches GET /calls/history/{id}. CTAs are
 * driven off the booking + call status. Mirrors mobile/lib/features/
 * call_details/screen/call_details_screen.dart.
 */
export function CallDetailsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteType>();
  const { callId } = route.params;
  const { user } = useAuthSession();

  const [raw, setRaw] = useState<CallHistoryItem | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callsApi
      .getHistoryItem(callId)
      .then((item) => {
        if (!cancelled) setRaw(item);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e : ApiError.network);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [callId]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error && !raw) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight, padding: 24 }}>
        <AppText variant="body" color={colors.textMuted} align="center">
          {apiErrorMessage(error)}
        </AppText>
      </View>
    );
  }

  if (!raw) return null;
  const call = toDetail(raw);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
        <AppIconButton icon={<AppIcon name="back" size={20} color={colors.textJet} />} variant="ghost" backgroundColor={colors.background} size={44} onPress={() => navigation.goBack()} />
        <View style={{ width: 12 }} />
        <AppText variant="header" color={colors.textJet} weight="700" align="left">
          Call details
        </AppText>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
        <CallParticipantHeader call={call} />
        <View style={{ height: 16 }} />
        <CallInfoCard call={call} />
        <View style={{ height: 16 }} />
        <CallActionButtons
          call={call}
          onJoin={() =>
            navigation.navigate('CallSession', {
              sessionId: call.id,
              kind: call.callType,
              role: 'caller',
              selfId: user?.id ?? '',
              peerId: call.professionalId,
              peerName: call.name,
              peerRole: call.role,
              peerAvatarUrl: call.avatarKey,
            })
          }
          onReschedule={() => showToast('Reschedule coming soon', { type: 'info' })}
          onScheduleAnother={() => navigation.navigate('Professional', { professionalId: call.professionalId })}
          onViewProfile={() => navigation.navigate('Professional', { professionalId: call.professionalId })}
        />
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
