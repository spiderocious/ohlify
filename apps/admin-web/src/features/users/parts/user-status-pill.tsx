import { AdminKycStatus, AdminUserStatus } from '@ohlify/api';

import { humanizeStatus } from '../../../shared/lib/labels.js';
import { StatusPill, type StatusTone } from '../../../shared/parts/status-pill.js';

const USER_STATUS_TONE: Record<string, StatusTone> = {
  [AdminUserStatus.ACTIVE]: 'success',
  [AdminUserStatus.SUSPENDED]: 'warning',
  [AdminUserStatus.BLOCKED]: 'danger',
  [AdminUserStatus.DELETED]: 'muted',
};

// AdminKycStatus.PENDING resolves to 'pending_review' on the wire (matches
// users.kyc_status enum values), so we don't need a separate literal entry.
const KYC_STATUS_TONE: Record<string, StatusTone> = {
  [AdminKycStatus.NONE]: 'muted',
  [AdminKycStatus.PENDING]: 'warning',
  [AdminKycStatus.APPROVED]: 'success',
  [AdminKycStatus.REJECTED]: 'danger',
};

export function UserStatusPill({ status }: { status: string }) {
  return <StatusPill label={humanizeStatus(status)} tone={USER_STATUS_TONE[status] ?? 'neutral'} />;
}

export function KycStatusPill({ status }: { status: string }) {
  return <StatusPill label={humanizeStatus(status)} tone={KYC_STATUS_TONE[status] ?? 'neutral'} />;
}
