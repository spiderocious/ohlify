import type { CallType } from '@features/bookings/bookings.types.js';

export interface DevCallParty {
  uid: number;
  agora_token: string;
  token_expires_at: string;
}

export interface DevCallSession {
  session_id: string;
  channel: string;
  call_type: CallType;
  duration_minutes: number;
  label: string | null;
  expires_at: string;
  party_a: DevCallParty;
  party_b: DevCallParty;
}

export type DevCallPartyKey = 'a' | 'b';

export interface DevCallPartyView extends DevCallParty {
  session_id: string;
  channel: string;
  call_type: CallType;
  duration_minutes: number;
  peer_uid: number;
}
