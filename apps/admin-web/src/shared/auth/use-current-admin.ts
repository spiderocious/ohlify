import { useEffect, useState } from 'react';

import { adminSession } from '@ohlify/api';
import type { AdminUser } from '@ohlify/api';

/**
 * Reads the current admin from session storage. Re-renders on cross-tab
 * `storage` events so a logout in one tab kicks the other out too.
 *
 * Storage is the source of truth — no in-memory mirror — because the ky
 * client also reads from it on every request. Keeping this hook stateless
 * (just selecting from storage) avoids drift.
 */
export function useCurrentAdmin(): AdminUser | null {
  const [admin, setAdmin] = useState<AdminUser | null>(() => adminSession.getUser());

  useEffect(() => {
    const onStorage = () => setAdmin(adminSession.getUser());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return admin;
}
