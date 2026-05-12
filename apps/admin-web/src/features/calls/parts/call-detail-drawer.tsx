import { AppButton, AppText } from '@ohlify/ui';
import { AdminCallStatus } from '@ohlify/api';

import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { confirm, promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatDuration } from '../../../shared/format/datetime.js';
import { formatKobo } from '../../../shared/format/kobo.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useAdminCall, useForceEndCall, useRefundCall } from '../api/use-calls.js';
import { CallStatusPill } from './call-status-pill.js';

interface CallDetailDrawerProps {
  callId: string | null;
  onClose: () => void;
}

export function CallDetailDrawer({ callId, onClose }: CallDetailDrawerProps) {
  const detail = useAdminCall(callId);
  const forceEnd = useForceEndCall(callId ?? '');
  const refund = useRefundCall(callId ?? '');
  const call = detail.data;

  const onForceEnd = async () => {
    if (!call) return;
    if (
      !(await confirm({
        title: 'Force-end call?',
        message:
          'Triggers immediate settlement using the connected_seconds reported so far. This is irreversible.',
        destructive: true,
      }))
    )
      return;
    forceEnd.mutate(undefined, {
      onSuccess: () => toastSuccess('Call ended + settled'),
      onError: (err) => toastError(err),
    });
  };

  const onRefund = async () => {
    if (!call) return;
    const totalKoboRaw = call.booking?.total_paid_kobo;
    const amountKobo =
      typeof totalKoboRaw === 'string' ? Number(totalKoboRaw) : (totalKoboRaw ?? 0);
    const reason = await promptForReason({
      title: 'Manual refund',
      message: `Refund the caller. This defaults to the full booking amount of ${formatKobo(totalKoboRaw)}.`,
    });
    if (!reason) return;
    refund.mutate(
      { amount_kobo: amountKobo, reason, request_id: `admin-refund-${call.id}-${Date.now()}` },
      {
        onSuccess: () => toastSuccess('Refund posted'),
        onError: (err) => toastError(err),
      },
    );
  };

  const isInflight =
    call?.status === AdminCallStatus.SCHEDULED ||
    call?.status === AdminCallStatus.WAITING_FOR_PARTIES ||
    call?.status === AdminCallStatus.IN_PROGRESS;

  return (
    <DetailDrawer
      open={Boolean(callId)}
      onClose={onClose}
      title={call ? `Call ${shortId(call.id, 12)}` : 'Call'}
      subtitle={call ? formatDateTime(call.created_at) : undefined}
      width={560}
      footer={
        call ? (
          <>
            <AppButton label="Refund" variant="outline" height={36} onPressed={onRefund} />
            {isInflight && (
              <AppButton label="Force end" variant="solid" height={36} onPressed={onForceEnd} />
            )}
          </>
        ) : null
      }
    >
      <QueryView isLoading={detail.isLoading} error={detail.error}>
        {call && (
          <>
            <DetailSection title="Call">
              <DetailRow label="Status">
                <CallStatusPill status={call.status} />
              </DetailRow>
              <DetailRow label="ID">{shortId(call.id, 18)}</DetailRow>
              <DetailRow label="Booking ID">{shortId(call.booking_id, 18)}</DetailRow>
              <DetailRow label="Channel">
                <code className="text-xs">{call.agora_channel_name ?? '—'}</code>
              </DetailRow>
              <DetailRow label="Connected">{formatDuration(call.connected_seconds)}</DetailRow>
              <DetailRow label="Caller joined">{formatDateTime(call.caller_joined_at)}</DetailRow>
              <DetailRow label="Callee joined">{formatDateTime(call.callee_joined_at)}</DetailRow>
              <DetailRow label="Caller left">{formatDateTime(call.caller_left_at)}</DetailRow>
              <DetailRow label="Callee left">{formatDateTime(call.callee_left_at)}</DetailRow>
              <DetailRow label="Ended">{formatDateTime(call.ended_at)}</DetailRow>
              <DetailRow label="Created">{formatDateTime(call.created_at)}</DetailRow>
            </DetailSection>

            {call.booking && (
              <DetailSection title="Booking">
                <DetailRow label="Caller">
                  <UserLink userId={call.booking.caller_user_id} idLen={18} />
                </DetailRow>
                <DetailRow label="Callee">
                  <UserLink userId={call.booking.callee_user_id} idLen={18} />
                </DetailRow>
                <DetailRow label="Type">{humanizeStatus(call.booking.call_type)}</DetailRow>
                <DetailRow label="Duration">{call.booking.duration_minutes} min</DetailRow>
                <DetailRow label="Scheduled">{formatDateTime(call.booking.start_at)}</DetailRow>
                <DetailRow label="Paid">
                  <AppText variant="bodyTitle">{formatKobo(call.booking.total_paid_kobo)}</AppText>
                </DetailRow>
                <DetailRow label="Payee receives">
                  {formatKobo(call.booking.payee_amount_kobo)}
                </DetailRow>
                <DetailRow label="Platform fee">
                  {formatKobo(call.booking.platform_fee_kobo)}
                </DetailRow>
                <DetailRow label="Fee mode">{humanizeStatus(call.booking.fee_mode_used)}</DetailRow>
              </DetailSection>
            )}

            <DetailSection title="Ledger">
              <DetailRow label="Settlement journal">
                {shortId(call.settlement_journal_id, 18)}
              </DetailRow>
              <DetailRow label="Refund journal">{shortId(call.refund_journal_id, 18)}</DetailRow>
            </DetailSection>
          </>
        )}
      </QueryView>
    </DetailDrawer>
  );
}
