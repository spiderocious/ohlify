import type { CaEvent } from '@shared/bridge/bridge.types.js';

// A whitelist of '*' means all events pass. An array means only those events.
export type EventWhitelist = '*' | CaEvent[];

// The participant whose browser emitted this event (always the local side).
export interface EventAuthor {
  uid: number | null;
  name: string | null;
}

export interface EventPayload {
  event: string;
  ts: number;
  // Who sent this event — the local participant on the device that produced it.
  author: EventAuthor;
  // Static context — everything knowable at emit time
  call_id: string | null;
  call_reference: string | null;
  agora_channel: string | null;
  local_uid: number | null;
  platform: 'web';
  // Participant snapshot
  participants: EventParticipantSnapshot[];
  // Call state snapshot
  phase: string | null;
  muted: boolean | null;
  camera_enabled: boolean | null;
  duration_seconds: number | null; // elapsed call seconds at emit time (null if not active)
  duration_minutes_limit: number | null; // configured limit; null = open-ended
  // Remote state (best-effort — only if info is available, never rigged)
  remote_muted: boolean | null;
  // Event-specific data
  data: Record<string, unknown>;
}

export interface EventParticipantSnapshot {
  uid: number;
  name: string;
  avatar_key: string | null;
  role: 'local' | 'remote';
}

export interface EventProvider {
  name: string;
  whitelist: EventWhitelist;
  // Event types in this set are deduplicated: if consecutive payloads for the
  // same event type have identical `data`, the second is dropped.
  dedupeEvents?: Set<string>;
  send(payload: EventPayload): void;
}
