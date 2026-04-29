export const StrikeStatus = {
  ACTIVE: 'active',
  DISPUTED: 'disputed',
  UPHELD: 'upheld',
  VOIDED: 'voided',
} as const;

export type StrikeStatus = (typeof StrikeStatus)[keyof typeof StrikeStatus];

export const StrikeReason = {
  NO_SHOW: 'no_show',
  LATE_CANCEL: 'late_cancel',
  MID_CALL_QUIT: 'mid_call_quit',
} as const;

export type StrikeReason = (typeof StrikeReason)[keyof typeof StrikeReason];

export interface StrikeRow {
  id: string;
  professional_user_id: string;
  related_call_id: string | null;
  related_booking_id: string | null;
  reason_code: StrikeReason;
  description: string | null;
  status: StrikeStatus;
  dispute_comment: string | null;
  disputed_at: Date | null;
  admin_review_comment: string | null;
  reviewed_by_admin_id: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StrikeView {
  id: string;
  professional_user_id: string;
  related_call_id: string | null;
  related_booking_id: string | null;
  reason_code: StrikeReason;
  description: string | null;
  status: StrikeStatus;
  dispute_comment: string | null;
  disputed_at: string | null;
  admin_review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface StrikeSummaryView {
  active_count: number; // strikes that count toward the ban (active + upheld)
  total_count: number; // including disputed + voided
  remaining_before_ban: number;
  strikes_before_ban: number;
}
