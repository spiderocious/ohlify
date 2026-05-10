import { AdminBookingStatus, AdminCallStatus } from '@ohlify/api';

import { humanizeStatus } from '../../../shared/lib/labels.js';
import { StatusPill, type StatusTone } from '../../../shared/parts/status-pill.js';

const CALL_TONE: Record<string, StatusTone> = {
  [AdminCallStatus.SCHEDULED]: 'info',
  [AdminCallStatus.WAITING_FOR_PARTIES]: 'warning',
  [AdminCallStatus.IN_PROGRESS]: 'info',
  [AdminCallStatus.COMPLETED]: 'success',
  [AdminCallStatus.CANCELLED]: 'muted',
  [AdminCallStatus.NO_SHOW]: 'danger',
  [AdminCallStatus.TIMEOUT]: 'danger',
};

const BOOKING_TONE: Record<string, StatusTone> = {
  [AdminBookingStatus.PENDING]: 'warning',
  [AdminBookingStatus.CONFIRMED]: 'info',
  [AdminBookingStatus.CANCELLED]: 'muted',
  [AdminBookingStatus.COMPLETED]: 'success',
};

export function CallStatusPill({ status }: { status: string }) {
  return <StatusPill label={humanizeStatus(status)} tone={CALL_TONE[status] ?? 'neutral'} />;
}

export function BookingStatusPill({ status }: { status: string }) {
  return <StatusPill label={humanizeStatus(status)} tone={BOOKING_TONE[status] ?? 'neutral'} />;
}
