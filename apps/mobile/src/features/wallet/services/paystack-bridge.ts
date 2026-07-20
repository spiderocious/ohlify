/**
 * Tiny event bridge between paystack-service.ts (which returns a Promise to
 * its caller) and the PaystackWebViewScreen route (which can only report
 * back via a callback since React Navigation has no `Navigator.push<T>`
 * equivalent that resolves with a value on pop). One in-flight session at a
 * time — matches the Dart source's single-modal-push usage.
 */
import type { PaystackResult } from './paystack-service';

let pendingResolve: ((result: PaystackResult) => void) | null = null;

export const paystackBridge = {
  begin(onResolve: (result: PaystackResult) => void) {
    pendingResolve = onResolve;
  },
  settle(result: PaystackResult) {
    pendingResolve?.(result);
    pendingResolve = null;
  },
};
