import { IconBack } from '@icons';
import { useNavigate, useParams } from 'react-router-dom';

import { ROUTES, formatNaira, type CallDetail } from '@ohlify/core';
import { AppIconButton, AppLoader, AppText } from '@ohlify/ui';
import type { CallHistoryItem } from '@ohlify/api';

import { useCallHistoryItem } from '../api/use-call-history-item.js';
import { CallActionButtons } from './parts/call-action-buttons.js';
import { CallHistorySection } from './parts/call-history-section.js';
import { CallInfoCard } from './parts/call-info-card.js';
import { CallParticipantHeader } from './parts/call-participant-header.js';

const SELF_ID = 'me';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

function detailStatus(h: CallHistoryItem): CallDetail['status'] {
  if (h.booking_status.startsWith('cancelled_')) return 'missed';
  if (h.call_status === 'completed') return 'completed';
  if (
    h.call_status === 'no_show_caller' ||
    h.call_status === 'no_show_callee' ||
    h.call_status === 'no_show_both' ||
    h.call_status === 'disconnected_caller' ||
    h.call_status === 'disconnected_callee'
  ) {
    return 'missed';
  }
  return 'upcoming';
}

/** Mirrors mobile/lib/features/call_details/screen/call_details_screen.dart. */
export function CallDetailsScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();

  const { data: item, isLoading } = useCallHistoryItem(id);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-light">
        <AppLoader />
      </main>
    );
  }

  if (!item) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-light">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="font-sans text-sm text-primary"
        >
          Call not found — go back
        </button>
      </main>
    );
  }

  const professionalId = item.callee_user_id;
  const totalKobo = item.total_paid_kobo;

  const call: CallDetail = {
    id: item.call_id,
    professionalId,
    name: professionalId,
    role: '',
    rating: 0,
    callType: item.call_type,
    status: detailStatus(item),
    time: formatTime(item.start_at),
    date: formatDate(item.start_at),
    duration: `${item.duration_minutes} mins`,
    canJoin: item.call_status === 'scheduled' || item.call_status === 'waiting_for_parties',
    canReschedule: item.call_status === 'scheduled' && item.booking_status === 'confirmed',
    amount: totalKobo > 0 ? formatNaira(totalKobo) : undefined,
  };

  const onJoin = () => {
    const kind = call.callType === 'video' ? 'video' : 'audio';
    navigate(
      ROUTES.CALL_SESSION.build({
        role: 'caller',
        kind,
        selfId: SELF_ID,
        peerId: professionalId,
        sessionId: item.call_id,
      }),
    );
  };

  return (
    <main className="flex min-h-screen flex-col bg-surface-light">
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pt-2 lg:max-w-5xl">
        <div className="flex items-center gap-3 py-2">
          <AppIconButton
            icon={<IconBack color="var(--ohl-text-jet)" size={20} />}
            variant="ghost"
            backgroundColor="var(--ohl-background)"
            size={44}
            onPressed={() => navigate(-1)}
            ariaLabel="Back"
          />
          <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
            Call details
          </AppText>
        </div>

        <div className="mt-2 space-y-5">
          <CallParticipantHeader call={call} />
          <CallInfoCard call={call} />
          <CallHistorySection history={[]} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2 lg:max-w-5xl">
        <CallActionButtons
          call={call}
          onJoin={onJoin}
          onReschedule={() => navigate(ROUTES.SCHEDULE_CALL.build({ id: professionalId }))}
          onScheduleAnother={() => navigate(ROUTES.SCHEDULE_CALL.build({ id: professionalId }))}
          onViewProfile={() => navigate(ROUTES.PROFESSIONAL.build({ id: professionalId }))}
        />
      </div>
    </main>
  );
}
