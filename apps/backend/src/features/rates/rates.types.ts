export type CallType = 'audio' | 'video';

export interface RateRow {
  id: string;
  user_id: string;
  call_type: CallType;
  duration_minutes: number;
  price_kobo: string;
  currency: string;
  created_at: Date;
  deleted_at: Date | null;
}

export interface RateView {
  id: string;
  call_type: CallType;
  duration_minutes: number;
  price_kobo: number;
  currency: string;
}
