export const StrikeStatus = {
  ACTIVE: 'active',
  DISPUTED: 'disputed',
  UPHELD: 'upheld',
  VOIDED: 'voided',
} as const;

export type StrikeStatus = (typeof StrikeStatus)[keyof typeof StrikeStatus];

export const StrikeReason = {
  // Pro-side
  NO_SHOW: 'no_show',
  LATE_CANCEL: 'late_cancel',
  MID_CALL_QUIT: 'mid_call_quit',
  // Caller-side
  CALLER_NO_SHOW: 'caller_no_show',
  CALLER_DISCONNECT: 'caller_disconnect',
} as const;

export type StrikeReason = (typeof StrikeReason)[keyof typeof StrikeReason];

export const SubjectRole = {
  PROFESSIONAL: 'professional',
  CALLER: 'caller',
} as const;

export type SubjectRole = (typeof SubjectRole)[keyof typeof SubjectRole];

export interface StrikeRow {
  id: string;
  subject_user_id: string;
  subject_role: SubjectRole;
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
  subject_user_id: string;
  subject_role: SubjectRole;
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

// Admin moderation surface needs the subject denormalized so the queue
// shows who the strike is against without an extra round-trip. Keeps the
// rest of StrikeView's shape verbatim so callers that already consume the
// admin list don't have to refactor.
export interface AdminStrikeView extends Omit<StrikeView, 'subject_user_id'> {
  subject: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    role: SubjectRole;
  };
  reviewed_by_admin_id: string | null;
}

export interface AdminStrikeDetailView extends AdminStrikeView {
  related_call: {
    id: string;
    call_type: 'audio' | 'video';
    scheduled_at: string;
    status: string;
    connected_seconds: number;
  } | null;
  related_booking: {
    id: string;
    status: string;
    created_at: string;
  } | null;
  subject_strike_history: {
    total_count: number;
    active_count: number;
    upheld_count: number;
    voided_count: number;
    strikes_before_ban: number;
  };
  audit_trail: Array<{
    id: string;
    action: string;
    admin_id: string | null;
    admin_email: string | null;
    note: string | null;
    created_at: string;
  }>;
}

export interface StrikeSummaryView {
  // Per-role counters so mobile can render "you have N strikes as a pro" + "M
  // strikes as a caller" for users who hold both roles.
  professional: {
    active_count: number;
    total_count: number;
    strikes_before_ban: number;
    remaining_before_ban: number;
  };
  caller: {
    active_count: number;
    total_count: number;
    strikes_before_ban: number;
    remaining_before_ban: number;
  };
}
