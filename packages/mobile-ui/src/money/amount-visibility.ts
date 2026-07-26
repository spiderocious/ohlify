import { useSyncExternalStore } from 'react';

/**
 * Whether monetary amounts are shown or masked, app-wide.
 *
 * One global switch rather than per-screen state: someone hiding their balance
 * on a bus wants every amount hidden, and a wallet card that masks while a
 * transaction row does not would defeat the purpose entirely.
 *
 * Lives in mobile-ui because the components that render money live here, and a
 * store in the app would mean every primitive taking a prop it should not need.
 * Persistence is the app's job — it owns storage — via `setAmountsHidden` on
 * boot.
 */
let hidden = false;
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) listener();
};

export const amountVisibility = {
  isHidden: (): boolean => hidden,

  set(next: boolean): void {
    if (hidden === next) return;
    hidden = next;
    emit();
  },

  toggle(): void {
    hidden = !hidden;
    emit();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Re-renders the caller whenever the switch flips. */
export function useAmountsHidden(): boolean {
  return useSyncExternalStore(amountVisibility.subscribe, amountVisibility.isHidden, () => false);
}

/** What a hidden amount looks like. Fixed width so layout does not jump on toggle. */
export const MASKED_AMOUNT = '••••••';

/** Formats through `format`, or masks — the single place amounts become text. */
export function maskAmount(value: number, format: (v: number) => string): string {
  return hidden ? MASKED_AMOUNT : format(value);
}
