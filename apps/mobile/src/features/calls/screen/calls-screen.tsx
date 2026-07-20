import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, AppTabView, colors, showConfirmationModal, showToast } from '@ohlify/mobile-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { bookingsApi } from '@features/bookings/api/bookings-api';
import { useCallHistory } from '@features/calls/api/use-call-history';
import { CompletedCallsList } from '@features/calls/screen/parts/completed-calls-list';
import { ScheduledCallsList } from '@features/calls/screen/parts/scheduled-calls-list';
import { callHistoryQueryKey } from '@features/calls/api/use-call-history';
import { callStateLabel, callTabOf, type CallHistoryItem } from '@features/calls/types/call-models';
import type { CompletedCallGroup, CompletedCallItem, ScheduledCallItem } from '@features/calls/types/call-card-models';

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h24 = d.getHours();
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${h12}:${m} ${ampm}`;
}

function formatDuration(c: CallHistoryItem): string {
  if (c.durationMinutes > 0) return `${c.durationMinutes} mins`;
  if (c.connectedSeconds === undefined) return '—';
  return `${Math.round(c.connectedSeconds / 60)} mins`;
}

function toScheduled(c: CallHistoryItem): ScheduledCallItem {
  return {
    id: c.id,
    name: c.peerName ?? 'Unknown',
    role: c.callType === 'video' ? 'Video call' : 'Audio call',
    rating: 0,
    callType: c.callType,
    time: formatTime(c.startAt),
    date: formatDate(c.startAt),
    duration: formatDuration(c),
    canReschedule: new Date(c.startAt).getTime() - Date.now() > 30 * 60_000,
    avatarKey: c.peerAvatarKey,
  };
}

function toCompleted(c: CallHistoryItem): CompletedCallItem {
  return {
    id: c.id,
    name: c.peerName ?? 'Unknown',
    callType: c.callType,
    time: `${formatDate(c.startAt)} · ${formatTime(c.startAt)}`,
    duration: formatDuration(c),
    amount: c.priceKobo === undefined ? '—' : `₦${Math.round(c.priceKobo / 100)}`,
    stateLabel: callStateLabel(c),
    avatarKey: c.peerAvatarKey,
  };
}

function groupCompleted(items: CallHistoryItem[]): CompletedCallGroup[] {
  const by = new Map<string, CompletedCallItem[]>();
  for (const c of items) {
    const key = formatDate(c.startAt);
    const list = by.get(key) ?? [];
    list.push(toCompleted(c));
    by.set(key, list);
  }
  return Array.from(by.entries()).map(([date, calls]) => ({ date, calls }));
}

/**
 * Two-tab calls list (Scheduled / Completed) over a single paginated
 * `GET /calls/history` query. Mirrors mobile/lib/features/calls/screen/
 * calls_screen.dart. Cancelled/missed/disconnected rows live under the
 * Completed tab with a stateLabel chip.
 */
export function CallsScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const queryClient = useQueryClient();
  const query = useCallHistory();
  const { user, isProfessional } = useAuthSession();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allItems = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const scheduled = useMemo(() => allItems.filter((c) => callTabOf(c) === 'scheduled'), [allItems]);
  const completed = useMemo(() => allItems.filter((c) => callTabOf(c) === 'completed'), [allItems]);

  async function refresh() {
    setIsRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCancel(item: ScheduledCallItem) {
    let confirmed = false;
    const message = isProfessional
      ? 'This client has already booked and paid for this slot. Cancelling will refund them and cannot be undone.'
      : 'You will lose your held slot. Refunds may apply.';
    const handle = showConfirmationModal('Cancel booking?', message, {
      kind: 'error',
      destructive: true,
      confirmButtonText: 'Cancel booking',
      cancelButtonText: 'Keep',
      onConfirm: () => {
        confirmed = true;
      },
    });
    await handle.onDismissed;
    if (!confirmed) return;
    try {
      await bookingsApi.cancel(item.id);
      queryClient.invalidateQueries({ queryKey: callHistoryQueryKey() });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      await query.refetch();
      showToast('Booking cancelled', { type: 'success' });
    } catch (e) {
      showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
    }
  }

  function emptyState(message: string) {
    return (
      <View style={{ paddingVertical: 48 }}>
        <AppText variant="body" color={colors.textMuted} align="center">
          {message}
        </AppText>
      </View>
    );
  }

  function joinCall(item: ScheduledCallItem) {
    const raw = scheduled.find((c) => c.id === item.id);
    if (!raw) return;
    navigation.navigate('CallSession', {
      sessionId: raw.id,
      kind: raw.callType,
      role: 'caller',
      selfId: user?.id ?? '',
      peerId: raw.peerUserId,
      peerName: raw.peerName ?? 'Unknown',
      peerRole: raw.callType === 'video' ? 'Video call' : 'Audio call',
      peerAvatarUrl: raw.peerAvatarKey,
    });
  }

  function scheduledList(items: CallHistoryItem[]) {
    if (items.length === 0) return emptyState('No upcoming calls.');
    return (
      <ScheduledCallsList
        calls={items.map(toScheduled)}
        onCancel={handleCancel}
        onReschedule={() => showToast('Reschedule coming soon', { type: 'info' })}
        onJoin={joinCall}
        onTap={(item) => navigation.navigate('Call', { callId: item.id })}
      />
    );
  }

  function historyList(items: CallHistoryItem[], emptyMessage: string) {
    if (items.length === 0) return emptyState(emptyMessage);
    return <CompletedCallsList groups={groupCompleted(items)} onTap={(item) => navigation.navigate('Call', { callId: item.id })} />;
  }

  const isLoadingInitial = query.isLoading;
  const hasError = query.isError && allItems.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight, paddingTop: 12 }}>
      {isLoadingInitial ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : hasError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <AppText variant="body" color={colors.textMuted} align="center">
            {apiErrorMessage(query.error instanceof ApiError ? query.error : ApiError.network)}
          </AppText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        >
          <AppText variant="title" color={colors.textJet} align="left" weight="800">
            Calls
          </AppText>
          <View style={{ height: 16 }} />
          <AppTabView
            tabs={[
              { label: 'Scheduled', child: scheduledList(scheduled) },
              { label: 'Completed', child: historyList(completed, 'No completed calls yet.') },
            ]}
          />
          {query.hasNextPage ? (
            <>
              <View style={{ height: 16 }} />
              <Pressable
                disabled={query.isFetchingNextPage}
                onPress={() => query.fetchNextPage()}
                style={{ alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'MonaSans-Medium', color: colors.primary }}>
                  {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
