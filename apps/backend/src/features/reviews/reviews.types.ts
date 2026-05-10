export interface ReviewRow {
  id: string;
  call_id: string;
  reviewer_user_id: string;
  subject_user_id: string;
  rating: number;
  feedback_text: string | null;
  is_public: boolean;
  hidden_at: Date | null;
  hidden_by_admin_id: string | null;
  hide_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewView {
  id: string;
  call_id: string;
  rating: number;
  feedback_text: string | null;
  is_public: boolean;
  reviewer: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
  subject_user_id: string;
  created_at: string;
}

// Admin moderation surface needs the hidden_* metadata + a denormalized
// `subject` user object (name + avatar) so the queue is usable without
// extra round-trips. Returned by /admin/reviews and /admin/reviews/:id.
export interface AdminReviewView {
  id: string;
  call_id: string;
  rating: number;
  feedback_text: string | null;
  is_public: boolean;
  reviewer: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
  subject: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
  hidden_at: string | null;
  hidden_by_admin_id: string | null;
  hide_reason: string | null;
  created_at: string;
}

// Detail view extends the list view with call context + audit trail.
export interface AdminReviewDetailView extends AdminReviewView {
  call: {
    id: string;
    call_type: 'audio' | 'video';
    duration_minutes: number;
    connected_seconds: number;
    scheduled_at: string;
    status: string;
  } | null;
  audit_trail: Array<{
    id: string;
    action: string;
    admin_id: string | null;
    admin_email: string | null;
    note: string | null;
    created_at: string;
  }>;
}

export interface ReviewAggregateRow {
  user_id: string;
  rating: string; // numeric → string from pg
  review_count: number;
  updated_at: Date;
}
