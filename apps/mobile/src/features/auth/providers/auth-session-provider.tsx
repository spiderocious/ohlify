import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { roleStore } from '@ohlify/mobile-ui';

import { profileApi } from '@features/profile/api/profile-api';
import type { MeResponse } from '@features/profile/types/me-response';
import { setOnForceLogout } from '@shared/api/api-client';
import { tokenService } from '@shared/services/token-service';
import { ApiError } from '@shared/types/api-error';

import { authApi } from '../api/auth-api';
import type { AuthSession, AuthUser, OnboardingStep } from '../types/auth-models';

/**
 * Global session state. Holds the current user and exposes login/logout.
 * Tokens themselves live in tokenService (secure storage); this context only
 * holds user metadata in memory for the lifetime of the process. Mirrors
 * mobile/lib/features/auth/providers/auth_session_notifier.dart.
 */
interface AuthSessionContextValue {
  user: AuthUser | null;
  onboardingStep: OnboardingStep;
  isAuthenticated: boolean;
  isRestoring: boolean;
  /** Role-derived helpers — the single source of truth for role-gating UI. See @ohlify/mobile-ui's ProfessionalView/ClientView, which consume these under the hood. */
  isProfessional: boolean;
  isClient: boolean;
  /** Rehydrates the session from stored tokens; resolves with whether the user ended up authenticated. */
  restore: () => Promise<boolean>;
  login: (params: { email: string; password: string }) => Promise<AuthSession>;
  completeRegistration: (session: AuthSession) => Promise<AuthSession>;
  setOnboardingStep: (step: OnboardingStep) => void;
  logout: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

/**
 * Maps the kyc_status returned by /me onto the onboarding step the
 * navigator uses to gate access. Mirrors the logic on the backend's
 * /onboarding/status so a resume on app relaunch doesn't need an extra call.
 */
function stepFromMe(me: MeResponse): OnboardingStep {
  switch (me.kycStatus) {
    case 'approved':
      return 'complete';
    case 'rejected':
      return 'kycRejected';
    case 'pending_review':
    case 'none':
    default:
      return me.role === 'professional' ? 'professionalKyc' : 'clientKyc';
  }
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [onboardingStep, setOnboardingStepState] = useState<OnboardingStep>('profile');
  const [isRestoring, setIsRestoring] = useState(true);

  const forceLogout = useCallback(() => {
    setUser(null);
    setOnboardingStepState('profile');
  }, []);

  useMemo(() => {
    setOnForceLogout(forceLogout);
  }, [forceLogout]);

  // Single point of truth feeding @ohlify/mobile-ui's roleStore — every
  // setUser(...) call site above ends up here instead of each needing its
  // own roleStore.setRole(...) call (which would be easy to forget/drift).
  useEffect(() => {
    roleStore.setRole(user?.role ?? null);
  }, [user]);

  /**
   * Rehydrates the in-memory session on app start when tokens are present in
   * secure storage. Without this the app would treat every cold start as
   * logged-out, since `user` only lives in memory.
   *
   * Strategy: if we have an access or refresh token, call /me. The API
   * client's refresh-and-retry flow transparently mints a new access token
   * from the refresh token if needed (or force-logs-out if the refresh is
   * dead), so we don't have to special-case "access expired but refresh
   * valid" here.
   */
  const restore = useCallback(async (): Promise<boolean> => {
    setIsRestoring(true);
    try {
      await tokenService.init();
      if (!tokenService.hasSession && tokenService.accessToken === null) {
        return false;
      }
      try {
        const me = await profileApi.getMe();
        setUser({ id: me.id, email: me.email, role: me.role, fullName: me.fullName });
        setOnboardingStepState(stepFromMe(me));
        return tokenService.accessToken !== null;
      } catch (error) {
        if (error instanceof ApiError) {
          // Refresh failed / session revoked — api-client already cleared
          // tokens and called forceLogout. Nothing to do here.
        }
        // Transport error (offline at startup, etc). Keep tokens; next
        // protected request will try again. Stay unauthenticated for now.
        return false;
      }
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const adoptSession = useCallback(async (session: AuthSession) => {
    await tokenService.setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    setUser(session.user);
    setOnboardingStepState(session.onboardingStep);
  }, []);

  const login = useCallback(
    async (params: { email: string; password: string }) => {
      const session = await authApi.login(params);
      await adoptSession(session);
      return session;
    },
    [adoptSession],
  );

  const completeRegistration = useCallback(
    async (session: AuthSession) => {
      await adoptSession(session);
      return session;
    },
    [adoptSession],
  );

  const setOnboardingStep = useCallback((step: OnboardingStep) => {
    setOnboardingStepState((prev) => (prev === step ? prev : step));
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenService.refreshToken;
    if (refresh) {
      try {
        await authApi.logout({ refreshToken: refresh });
      } catch {
        // Logout is idempotent — clear local state even if the call failed.
      }
    }
    await tokenService.clear();
    setUser(null);
    setOnboardingStepState('profile');
  }, []);

  const value: AuthSessionContextValue = {
    user,
    onboardingStep,
    isAuthenticated: user !== null && tokenService.accessToken !== null,
    isRestoring,
    isProfessional: user?.role === 'professional',
    isClient: user?.role === 'client',
    restore,
    login,
    completeRegistration,
    setOnboardingStep,
    logout,
  };

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return ctx;
}
