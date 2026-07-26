import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatSecondsAsDuration } from '@ohlify/core';
import { AppText, AppTabView, colors, showConfirmationModal, showToast } from '@ohlify/mobile-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { queryKeys } from '@shared/api/query-keys';
import { RefreshStatusLine } from '@shared/parts/refresh-status-line';
import { BannerPlacement } from '@features/banners/api/use-banner';
import { BannerSlot } from '@features/banners/screen/banner-slot';

import type { RootStackParamList } from '../../../app.navigation';
import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { bookingsApi } from '@features/bookings/api/bookings-api';
import { useCallHistory } from '@features/calls/api/use-call-history';
import { CompletedCallsList } from '@features/calls/screen/parts/completed-calls-list';
import { ScheduledCallsList } from '@features/calls/screen/parts/scheduled-calls-list';
import { callHistoryQueryKey } from '@features/calls/api/use-call-history';
import { callStateLabel, callTabOf, type CallHistoryItem } from '@features/calls/types/call-models';
import type { CompletedCallGroup, CompletedCallItem, ScheduledCallItem } from '@features/calls/types/call-card-models';
import {
  CallFilterBar,
  CallRangeFilter,
  CallStatusFilter,
} from '@features/calls/screen/parts/call-filter-bar';

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
  // Connected seconds first: billing is per-second, so rounding a 40s call to
  // "0 mins" would misreport a call the client was genuinely charged for.
  if (c.connectedSeconds !== undefined) return formatSecondsAsDuration(c.connectedSeconds);
  if (c.durationMinutes > 0) return formatSecondsAsDuration(c.durationMinutes * 60);
  return '—';
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

function toCompleted(c: CallHistoryItem, isProfessional: boolean): CompletedCallItem {
  // A professional's gross price is not their money — the platform fee comes
  // out of it. Showing total_paid_kobo to them would overstate every call.
  const amountKobo = isProfessional ? c.payeeAmountKobo : c.priceKobo;
  return {
    id: c.id,
    name: c.peerName ?? 'Unknown',
    callType: c.callType,
    time: `${formatDate(c.startAt)} · ${formatTime(c.startAt)}`,
    duration: formatDuration(c),
    amount: amountKobo === undefined ? '—' : `₦${Math.round(amountKobo / 100)}`,
    stateLabel: callStateLabel(c),
    avatarKey: c.peerAvatarKey,
  };
}

function groupCompleted(items: CallHistoryItem[], isProfessional: boolean): CompletedCallGroup[] {
  const by = new Map<string, CompletedCallItem[]>();
  for (const c of items) {
    const key = formatDate(c.startAt);
    const list = by.get(key) ?? [];
    list.push(toCompleted(c, isProfessional));
    by.set(key, list);
  }
  return Array.from(by.entries()).map(([date, calls]) => ({ date, calls }));
}

const RANGE_WINDOW_MS: Record<Exclude<CallRangeFilter, 'all'>, number> = {
  [CallRangeFilter.TODAY]: 86_400_000,
  [CallRangeFilter.WEEK]: 7 * 86_400_000,
  [CallRangeFilter.MONTH]: 30 * 86_400_000,
};

function hasActiveFilters(
  peerQuery: string,
  status: CallStatusFilter,
  range: CallRangeFilter,
): boolean {
  return (
    peerQuery.trim() !== '' || status !== CallStatusFilter.ALL || range !== CallRangeFilter.ALL
  );
}

/** Client-side because history is already paged into memory; the server filters nothing yet. */
function matchesFilters(
  call: CallHistoryItem,
  peerQuery: string,
  status: CallStatusFilter,
  range: CallRangeFilter,
): boolean {
  const needle = peerQuery.trim().toLowerCase();
  if (needle !== '' && !(call.peerName ?? '').toLowerCase().includes(needle)) return false;

  if (status !== CallStatusFilter.ALL) {
    const label = callStateLabel(call);
    if (status === CallStatusFilter.COMPLETED && label !== 'Completed') return false;
    if (status === CallStatusFilter.MISSED && label !== 'Missed') return false;
    if (status === CallStatusFilter.CANCELLED && label !== 'Cancelled') return false;
  }

  if (range !== CallRangeFilter.ALL) {
    const age = Date.now() - new Date(call.startAt).getTime();
    if (age > RANGE_WINDOW_MS[range]) return false;
  }
  return true;
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
  const [peerQuery, setPeerQuery] = useState('');
  const [status, setStatus] = useState<CallStatusFilter>(CallStatusFilter.ALL);
  const [range, setRange] = useState<CallRangeFilter>(CallRangeFilter.ALL);

  const allItems = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const scheduled = useMemo(() => allItems.filter((c) => callTabOf(c) === 'scheduled'), [allItems]);
  const completed = useMemo(() => {
    const done = allItems.filter((c) => callTabOf(c) === 'completed');
    return isProfessional ? done.filter((c) => matchesFilters(c, peerQuery, status, range)) : done;
  }, [allItems, isProfessional, peerQuery, status, range]);

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
    return <CompletedCallsList groups={groupCompleted(items, isProfessional)} onTap={(item) => navigation.navigate('Call', { callId: item.id })} />;
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
          <RefreshStatusLine queryKey={queryKeys.calls()} />
          <BannerSlot placement={BannerPlacement.CALLS} />
          <View style={{ height: 16 }} />
          {isProfessional ? (
            <>
              <CallFilterBar
                peerQuery={peerQuery}
                status={status}
                range={range}
                onPeerQuery={setPeerQuery}
                onStatus={setStatus}
                onRange={setRange}
              />
              <View style={{ height: 16 }} />
            </>
          ) : null}
          <AppTabView
            tabs={[
              { label: 'Scheduled', child: scheduledList(scheduled) },
              {
                label: 'Completed',
                child: historyList(
                  completed,
                  isProfessional && hasActiveFilters(peerQuery, status, range)
                    ? 'No calls match these filters.'
                    : 'No completed calls yet.',
                ),
              },
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
