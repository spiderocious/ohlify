import type { RealtimeEvent } from './realtime-events';

export interface RealtimeSignal {
  type: RealtimeEvent;
  data: Record<string, string>;
}

type Listener = (signal: RealtimeSignal) => void;

const listeners = new Set<Listener>();

/**
 * Realtime events that carry a payload a screen must act on.
 *
 * The provider's job is cache invalidation, which throws the payload away —
 * fine for "wallet changed", useless for "this specific invite needs your
 * answer". Screens that need the ids subscribe here instead.
 */
export const subscribeRealtimeSignals = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitRealtimeSignal = (signal: RealtimeSignal): void => {
  for (const listener of listeners) listener(signal);
};
