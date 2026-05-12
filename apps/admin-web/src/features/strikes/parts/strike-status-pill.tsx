import { StrikeStatus } from '@ohlify/api';

import { humanizeStatus } from '../../../shared/lib/labels.js';
import { StatusPill, type StatusTone } from '../../../shared/parts/status-pill.js';

const TONE: Record<string, StatusTone> = {
  [StrikeStatus.ACTIVE]: 'warning',
  [StrikeStatus.DISPUTED]: 'info',
  [StrikeStatus.UPHELD]: 'danger',
  [StrikeStatus.VOIDED]: 'muted',
};

export function StrikeStatusPill({ status }: { status: string }) {
  return <StatusPill label={humanizeStatus(status)} tone={TONE[status] ?? 'neutral'} />;
}
