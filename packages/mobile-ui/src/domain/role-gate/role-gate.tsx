import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { roleStore } from './role-store';

/**
 * Role-gating primitives. Source of truth for "is the current user a
 * professional or a client" — every screen that needs to hide/show
 * role-specific UI (rates, bank account, booking blocks, fund/withdraw
 * wallet buttons, etc.) should go through these instead of re-deriving
 * `user?.role === 'professional'` inline.
 */
export function useIsProfessional(): boolean {
  return useSyncExternalStore(roleStore.subscribe, roleStore.getSnapshot) === 'professional';
}

export function useIsClient(): boolean {
  return useSyncExternalStore(roleStore.subscribe, roleStore.getSnapshot) === 'client';
}

/** Renders `children` only when the current user is a professional. */
export function ProfessionalView({ children }: { children: ReactNode }) {
  const isProfessional = useIsProfessional();
  return isProfessional ? <>{children}</> : null;
}

/** Renders `children` only when the current user is a client. */
export function ClientView({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  return isClient ? <>{children}</> : null;
}
