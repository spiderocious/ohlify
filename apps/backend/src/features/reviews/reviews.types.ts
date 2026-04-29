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

export interface ReviewAggregateRow {
  user_id: string;
  rating: string; // numeric → string from pg
  review_count: number;
  updated_at: Date;
}
