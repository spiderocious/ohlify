import { CA_EVENTS, type CaEvent } from '@shared/bridge/bridge.types.js';
import type { EventPayload, EventProvider, EventWhitelist } from '../event-service.types.js';

// ── Whitelist ─────────────────────────────────────────────────────────────────
// Change to '*' to send every event to the backend.
// To add Sentry later: create a SentryProvider with its own whitelist.

export const BACKEND_EVENT_WHITELIST: EventWhitelist = [
  CA_EVENTS.JOINED,
  CA_EVENTS.REMOTE_JOINED,
  CA_EVENTS.REMOTE_LEFT,
  CA_EVENTS.ACTIVE,
  CA_EVENTS.MUTED,
  CA_EVENTS.CAMERA_CHANGED,
  CA_EVENTS.TOKEN_EXPIRING,
  CA_EVENTS.TOKEN_RENEWED,
  CA_EVENTS.DURATION_WARNING,
  CA_EVENTS.DURATION_PAUSED,
  CA_EVENTS.DURATION_RESUMED,
  CA_EVENTS.PERMISSION_NEEDED,
  CA_EVENTS.WARNING,
  CA_EVENTS.ERROR,
  CA_EVENTS.ENDED,
  CA_EVENTS.PHASE,
] as CaEvent[];

// Add network_quality here and to BACKEND_DEDUPE_EVENTS to get it deduplicated:
// CA_EVENTS.NETWORK_QUALITY — only forwarded when uplink/downlink values actually change.
export const BACKEND_DEDUPE_EVENTS = new Set<string>([CA_EVENTS.NETWORK_QUALITY, CA_EVENTS.PHASE]);

// ── Flush thresholds ──────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 5_000; // flush at least every 5 seconds
const FLUSH_BATCH_SIZE = 10; // flush immediately when queue reaches this

// ── Provider ──────────────────────────────────────────────────────────────────

interface BackendProviderOptions {
  endpoint: string;
  sessionToken: string;
  whitelist?: EventWhitelist;
  dedupeEvents?: Set<string>;
}

export class BackendProvider implements EventProvider {
  readonly name = 'backend';
  readonly whitelist: EventWhitelist;
  readonly dedupeEvents: Set<string>;

  private readonly endpoint: string;
  private readonly sessionToken: string;
  private readonly queue: EventPayload[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: BackendProviderOptions) {
    this.endpoint = opts.endpoint;
    this.sessionToken = opts.sessionToken;
    this.whitelist = opts.whitelist ?? BACKEND_EVENT_WHITELIST;
    this.dedupeEvents = opts.dedupeEvents ?? BACKEND_DEDUPE_EVENTS;

    // Start the periodic flush timer.
    this.flushTimer = setInterval(() => {
      this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  send(payload: EventPayload): void {
    this.queue.push(payload);
    if (this.queue.length >= FLUSH_BATCH_SIZE) {
      this.flush();
    }
  }

  // Flush the queue immediately — called by the timer, by threshold, and
  // externally on call end (ca:ended should never sit in the queue).
  flush(): void {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0); // drain atomically
    this.post(batch);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush(); // send whatever remains
  }

  private post(batch: EventPayload[]): void {
    // Accept array. Backend endpoint handles both single object and array.
    fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': this.sessionToken,
      },
      body: JSON.stringify(batch),
      keepalive: true, // survives page unload
    }).catch((err: unknown) => {
      console.warn('[events] backend provider flush failed:', err);
    });
  }
}
