import { useNavigate } from 'react-router-dom';

import {
  ROUTES,
  formatNaira,
  type CallStats,
  type ScheduledCallItem,
  type CompletedCallGroup,
  type CompletedCallItem,
} from '@ohlify/core';
import { AppTabView, AppText } from '@ohlify/ui';
import type { CallHistoryItem } from '@ohlify/api';

import { useCallHistory } from '../api/use-call-history.js';
import { useCancelBooking } from '../api/use-cancel-booking.js';
import { CallStatsSummary } from './parts/call-stats-summary.js';
import { CompletedCallsList } from './parts/completed-calls-list.js';
import { ScheduledCallsList } from './parts/scheduled-calls-list.js';

const SELF_ID = 'me';

const TERMINAL_CALL_STATUSES = new Set([
  'completed',
  'no_show_caller',
  'no_show_callee',
  'no_show_both',
  'disconnected_caller',
  'disconnected_callee',
]);

function formatCallDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCallTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

function formatGroupDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

function isCancelled(h: CallHistoryItem): boolean {
  return h.booking_status.startsWith('cancelled_');
}

function isScheduled(h: CallHistoryItem): boolean {
  return (
    h.booking_status === 'confirmed' && !TERMINAL_CALL_STATUSES.has(h.call_status)
  );
}

// Everything that's no longer "upcoming" — completed, cancelled, no-show,
// disconnected, fulfilled. Anything that wouldn't appear in the Scheduled tab.
function isHistorical(h: CallHistoryItem): boolean {
  return !isScheduled(h);
}

function stateLabel(h: CallHistoryItem): string {
  if (isCancelled(h)) return 'Cancelled';
  if (h.call_status === 'completed') return 'Completed';
  if (h.booking_status === 'fulfilled') return 'Completed';
  if (h.call_status === 'in_progress') return 'In progress';
  if (
    h.call_status === 'no_show_caller' ||
    h.call_status === 'no_show_callee' ||
    h.call_status === 'no_show_both'
  ) {
    return 'Missed';
  }
  if (
    h.call_status === 'disconnected_caller' ||
    h.call_status === 'disconnected_callee'
  ) {
    return 'Disconnected';
  }
  return 'Pending';
}

// Sort key for past groupings — prefer the moment that closed the row
// (ended_at, then cancelled_at) and fall back to start_at.
function pastSortIso(h: CallHistoryItem): string {
  return h.ended_at ?? h.cancelled_at ?? h.start_at;
}

function displayName(h: CallHistoryItem): string {
  return h.peer_name && h.peer_name.trim().length > 0 ? h.peer_name : 'Unknown';
}

function toScheduledItem(h: CallHistoryItem): ScheduledCallItem {
  const canReschedule = new Date(h.start_at).getTime() - Date.now() > 30 * 60 * 1000;
  return {
    id: h.call_id,
    name: displayName(h),
    role: h.call_type === 'video' ? 'Video call' : 'Audio call',
    rating: 0,
    callType: h.call_type,
    time: formatCallTime(h.start_at),
    date: formatCallDate(h.start_at),
    duration: `${h.duration_minutes} mins`,
    canReschedule,
    avatarKey: h.peer_avatar_url,
  };
}

function toHistoricalItem(h: CallHistoryItem): CompletedCallItem {
  const minutes = h.connected_seconds
    ? Math.round(h.connected_seconds / 60)
    : h.duration_minutes;
  const closedIso = pastSortIso(h);
  return {
    id: h.call_id,
    name: displayName(h),
    callType: h.call_type,
    time: formatCallTime(closedIso),
    duration: `${minutes} mins`,
    amount: formatNaira(h.total_paid_kobo),
    avatarKey: h.peer_avatar_url,
    stateLabel: stateLabel(h),
  };
}

function groupHistoricalByDate(items: CallHistoryItem[]): CompletedCallGroup[] {
  const groups = new Map<string, CompletedCallItem[]>();
  items.forEach((h) => {
    const key = formatGroupDate(pastSortIso(h));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(toHistoricalItem(h));
  });
  return Array.from(groups.entries()).map(([date, calls]) => ({ date, calls }));
}

/** Mirrors mobile/lib/features/calls/screen/calls_screen.dart. */
export function CallsScreen() {
  const navigate = useNavigate();
  const { data: historyPage } = useCallHistory();
  const cancelBooking = useCancelBooking();

  const all = historyPage?.data ?? [];

  const scheduled = all.filter(isScheduled);
  const historical = all.filter(isHistorical);

  const scheduledItems: ScheduledCallItem[] = scheduled.map(toScheduledItem);
  const historicalGroups: CompletedCallGroup[] = groupHistoricalByDate(historical);

  const stats: CallStats = {
    total: all.length,
    thisMonth: all.filter((h) => {
      const d = new Date(h.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    thisWeek: all.filter((h) => {
      const d = new Date(h.created_at);
      return Date.now() - d.getTime() < 7 * 86_400_000;
    }).length,
  };

  const cancelByCallId = (callId: string) => {
    const h = all.find((x) => x.call_id === callId);
    if (h) cancelBooking.mutate({ id: h.booking_id });
  };

  const joinCall = (call: ScheduledCallItem) => {
    const kind = call.callType === 'video' ? 'video' : 'audio';
    navigate(
      `${ROUTES.CALL_SESSION.build({
        role: 'caller',
        kind,
        selfId: SELF_ID,
        peerId: call.id,
        sessionId: call.id,
      })}?name=${encodeURIComponent(call.name)}`,
    );
  };

  const navToDetails = (id: string) => navigate(ROUTES.CALL.build({ id }));

  return (
    <div className="min-h-full bg-surface-light">
      <div className="mx-auto w-full max-w-3xl px-5 pb-8 pt-3 lg:max-w-5xl">
        <AppText variant="title" weight={800} align="start" color="var(--ohl-text-jet)">
          Calls
        </AppText>
        <div className="mt-4">
          <CallStatsSummary stats={stats} />
        </div>
        <div className="mt-6">
          <AppTabView
            tabs={[
              {
                label: 'Scheduled',
                child: (
                  <ScheduledCallsList
                    calls={scheduledItems}
                    onCancel={(c) => cancelByCallId(c.id)}
                    onReschedule={() => undefined}
                    onJoin={joinCall}
                    onTap={(c) => navToDetails(c.id)}
                  />
                ),
              },
              {
                label: 'Completed',
                child: (
                  <CompletedCallsList
                    groups={historicalGroups}
                    emptyMessage="No past calls yet."
                    onTap={(c) => navToDetails(c.id)}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
