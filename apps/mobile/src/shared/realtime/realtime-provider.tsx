import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';
import EventSource from 'react-native-sse';

import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { Env } from '@shared/config/env';
import { tokenService } from '@shared/services/token-service';

import {
  INVALIDATION_MAP,
  REALTIME_EVENT_NAMES,
  RealtimeEvent,
} from './realtime-events';
import { emitRealtimeSignal } from './realtime-signals';

const BASE_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

/**
 * Holds the SSE stream while the app is signed in and in the foreground.
 *
 * Closed on background rather than left open: a backgrounded app cannot render
 * anything a hint would trigger, and holding the socket only burns battery and
 * a server connection slot. Push already covers anything that must reach a
 * closed app.
 *
 * On reconnect the server sends a single `sync` and the client invalidates
 * everything. That is deliberately cheaper and more correct than replaying a
 * backlog — after a long gap the queue is both large and mostly stale.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthSession();
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated) return;

    let disposed = false;

    const close = (): void => {
      clearTimeout(reconnectTimerRef.current);
      sourceRef.current?.removeAllEventListeners();
      sourceRef.current?.close();
      sourceRef.current = null;
    };

    /** Backoff caps at 30s — a server that is down stays down, and hammering it does not help. */
    const scheduleReconnect = (): void => {
      if (disposed) return;
      const delay = Math.min(BASE_RECONNECT_MS * 2 ** retryRef.current, MAX_RECONNECT_MS);
      retryRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    const invalidate = (event: RealtimeEvent): void => {
      // `sync` means "you may have missed anything" — refetch everything live
      // rather than guessing which keys went stale while disconnected.
      if (event === RealtimeEvent.SYNC) {
        void queryClient.invalidateQueries();
        return;
      }
      for (const key of INVALIDATION_MAP[event] ?? []) {
        void queryClient.invalidateQueries({ queryKey: [...key] });
      }
    };

    function connect(): void {
      if (disposed) return;
      const token = tokenService.accessToken;
      if (!token) return;

      // Header auth, never a query-string token: a URL token lands in every
      // proxy and access log for the life of the connection.
      const source = new EventSource(`${Env.apiBaseUrl.replace(/\/$/, '')}/events`, {
        headers: { Authorization: `Bearer ${token}` },
        // The library's own reconnect is disabled so backoff lives in one place.
        pollingInterval: 0,
      });
      sourceRef.current = source;

      source.addEventListener('open', () => {
        retryRef.current = 0;
      });
      source.addEventListener('error', () => {
        close();
        scheduleReconnect();
      });
      for (const name of REALTIME_EVENT_NAMES) {
        source.addEventListener(name as never, (event: unknown) => {
          invalidate(name);
          // Re-emit with the payload for screens that need the ids, not just a
          // cache nudge. Parsing is defensive: a malformed frame must not take
          // the whole SSE connection down.
          const raw = (event as { data?: unknown } | undefined)?.data;
          if (typeof raw !== 'string' || raw.length === 0) return;
          try {
            const parsed = JSON.parse(raw) as { data?: Record<string, string> };
            emitRealtimeSignal({ type: name, data: parsed.data ?? {} });
          } catch {
            emitRealtimeSignal({ type: name, data: {} });
          }
        });
      }
    }

    const onAppStateChange = (state: string): void => {
      if (state === 'active') {
        if (!sourceRef.current) {
          retryRef.current = 0;
          connect();
        }
        return;
      }
      close();
    };

    connect();
    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => {
      disposed = true;
      subscription.remove();
      close();
    };
  }, [isAuthenticated, queryClient]);

  return <>{children}</>;
}
