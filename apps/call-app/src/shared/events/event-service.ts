import type { CaEvent } from '@shared/bridge/bridge.types.js';
import type { EventPayload, EventProvider, EventWhitelist } from './event-service.types.js';

// ── Singleton registry ────────────────────────────────────────────────────────

const providers: EventProvider[] = [];
// Per-provider, per-event last-data hash for deduplication.
const dedupeCache = new WeakMap<EventProvider, Map<string, string>>();

export const EventService = {
  register(provider: EventProvider): void {
    console.warn(`EventService: registering provider ${provider.name}`);
    providers.push(provider);
    if (provider.dedupeEvents?.size) {
      dedupeCache.set(provider, new Map());
    }
  },

  unregisterAll(): void {
    providers.length = 0;
    // WeakMap entries are GC'd automatically when providers are released.
  },

  emit(event: CaEvent, data: Record<string, unknown>, ctx: EventContext): void {
    const payload = buildPayload(event, data, ctx);
    for (const provider of providers) {
      if (!passes(event, provider.whitelist)) continue;
      if (!passesDedup(provider, event, data)) continue;
      provider.send(payload);
    }
  },
} as const;

// ── Context that callers supply at emit time ──────────────────────────────────

export interface EventContext {
  call_id: string | null;
  call_reference: string | null;
  agora_channel: string | null;
  local_uid: number | null;
  local_name: string | null;
  local_avatar_key: string | null;
  peer_uid: number | null;
  peer_name: string | null;
  peer_avatar_key: string | null;
  phase: string | null;
  muted: boolean | null;
  camera_enabled: boolean | null;
  connected_at: number | null;
  accumulated_paused_ms: number;
  duration_minutes: number | null;
  remote_muted: boolean | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function passes(event: CaEvent, whitelist: EventWhitelist): boolean {
  if (whitelist === '*') return true;
  return (whitelist as CaEvent[]).includes(event);
}

function passesDedup(
  provider: EventProvider,
  event: string,
  data: Record<string, unknown>,
): boolean {
  if (!provider.dedupeEvents?.has(event)) return true;
  const cache = dedupeCache.get(provider);
  if (!cache) return true;
  const hash = stableHash(data);
  if (cache.get(event) === hash) return false; // identical to last — drop
  cache.set(event, hash);
  return true;
}

// Stable deterministic hash of a plain object. Uses JSON with sorted keys so
// { a:1, b:2 } and { b:2, a:1 } produce the same hash.
function stableHash(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function buildPayload(
  event: CaEvent,
  data: Record<string, unknown>,
  ctx: EventContext,
): EventPayload {
  const participants: EventPayload['participants'] = [];
  if (ctx.local_uid !== null) {
    participants.push({
      uid: ctx.local_uid,
      name: ctx.local_name ?? '',
      avatar_key: ctx.local_avatar_key ?? null,
      role: 'local',
    });
  }
  if (ctx.peer_uid !== null) {
    participants.push({
      uid: ctx.peer_uid,
      name: ctx.peer_name ?? '',
      avatar_key: ctx.peer_avatar_key ?? null,
      role: 'remote',
    });
  }

  let durationSeconds: number | null = null;
  if (ctx.connected_at !== null) {
    durationSeconds = Math.floor(
      (Date.now() - ctx.connected_at - ctx.accumulated_paused_ms) / 1000,
    );
  }

  return {
    event,
    ts: Date.now(),
    author: { uid: ctx.local_uid, name: ctx.local_name },
    call_id: ctx.call_id,
    call_reference: ctx.call_reference,
    agora_channel: ctx.agora_channel,
    local_uid: ctx.local_uid,
    platform: 'web',
    participants,
    phase: ctx.phase,
    muted: ctx.muted,
    camera_enabled: ctx.camera_enabled,
    duration_seconds: durationSeconds,
    duration_minutes_limit: ctx.duration_minutes,
    remote_muted: ctx.remote_muted,
    data,
  };
}
