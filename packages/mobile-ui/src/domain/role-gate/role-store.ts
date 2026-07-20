import type { Role } from '@ohlify/core';

/**
 * Central "who is the current user" store. Plain module-level pub-sub
 * (subscribe/getSnapshot) so it works with useSyncExternalStore without a
 * context provider — same pattern as ../../modals/toast-store.ts.
 *
 * apps/mobile's AuthSessionProvider calls roleStore.setRole(...) whenever
 * the session's user changes (login, role-selection, logout, restore); this
 * package only ever reads it. Keeping the setter here (not a context) means
 * ProfessionalView/ClientView/useIsProfessional/useIsClient work anywhere in
 * the tree without every screen needing to be wrapped in a role provider.
 */
let currentRole: Role | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Role | null {
  return currentRole;
}

function setRole(role: Role | null): void {
  if (currentRole === role) return;
  currentRole = role;
  emit();
}

export const roleStore = { subscribe, getSnapshot, setRole };
