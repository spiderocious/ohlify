/**
 * In-process pub/sub for live call-state pushes (`call.cancelled`). The
 * push handler emits; whichever screen currently cares — the incoming-call
 * ring screen, or a caller sitting in the dialing phase — subscribes and
 * reacts (dismiss / hang up). Deliberately tiny: pushes are hints, the
 * backend call row stays the source of truth.
 */
export interface CallSignal {
  type: 'cancelled';
  callId: string;
  /** Why the ring stopped: 'cancelled' | 'declined' | 'timeout' | 'answered_elsewhere'. */
  reason: string;
}

type Listener = (signal: CallSignal) => void;

const listeners = new Set<Listener>();

export const subscribeCallSignals = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitCallSignal = (signal: CallSignal): void => {
  for (const listener of listeners) listener(signal);
};
