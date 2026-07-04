export interface CallSessionEventRow {
  id: string;
  call_id: string;
  call_reference: string | null;
  event: string;
  payload: Record<string, unknown>;
  occurred_at: Date;
  received_at: Date;
}

export interface CallSessionEventView {
  id: string;
  call_id: string;
  call_reference: string | null;
  event: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  received_at: string;
}

// Derived from the event stream: authoritative call duration info.
export interface CallSessionSummary {
  call_id: string;
  call_reference: string | null;
  event_count: number;
  first_event_at: string | null;
  last_event_at: string | null;
  // Timestamp when both participants were in the call (ca:active event).
  connected_at: string | null;
  // Timestamp of the ca:ended event.
  ended_at: string | null;
  // Authoritative connected_seconds: ended_at - connected_at.
  connected_seconds: number | null;
  end_reason: string | null;
  participants: CallSessionParticipantSummary[];
}

export interface CallSessionParticipantSummary {
  uid: number;
  name: string;
  avatar_key: string | null;
  role: 'local' | 'remote';
}
