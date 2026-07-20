import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import { useAuthSession } from './auth-session-provider';
import { authApi } from '../api/auth-api';
import type { AuthSession, OtpChannel } from '../types/auth-models';

/**
 * Holds the in-flight registration across the three screens
 * (register → create-password → verify-otp). Mirrors
 * mobile/lib/features/auth/providers/register_flow_notifier.dart. Scoped as
 * a React Context wrapping just those three screens' navigator group (like
 * the Dart version being route-shell-scoped) rather than global —
 * see app.navigation.tsx's Register stack group.
 */
interface RegisterFlowContextValue {
  email: string | null;
  phone: string | null;
  otpDestinationMasked: string | null;
  resendAvailableAt: string | null;
  initiate: (params: { email: string; phone: string; channel?: OtpChannel }) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  verify: (otp: string) => Promise<AuthSession>;
  resendOtp: () => Promise<string>;
}

const RegisterFlowContext = createContext<RegisterFlowContextValue | null>(null);

export function RegisterFlowProvider({ children }: { children: ReactNode }) {
  const { completeRegistration } = useAuthSession();
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [otpDestinationMasked, setOtpDestinationMasked] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const registrationTokenRef = useRef<string | null>(null);

  const requireToken = useCallback((): string => {
    const token = registrationTokenRef.current;
    if (!token) {
      throw new Error('Registration token missing — call initiate() before this step.');
    }
    return token;
  }, []);

  const initiate = useCallback(
    async (params: { email: string; phone: string; channel?: OtpChannel }) => {
      const result = await authApi.registerInitiate({
        email: params.email,
        phone: params.phone,
        channel: params.channel ?? 'email',
      });
      setEmail(params.email);
      setPhone(params.phone);
      registrationTokenRef.current = result.registrationToken;
      setOtpDestinationMasked(result.otpDestinationMasked);
      setResendAvailableAt(result.resendAvailableAt);
    },
    [],
  );

  const setPassword = useCallback(
    async (password: string) => {
      const token = requireToken();
      await authApi.registerSetPassword({ registrationToken: token, password });
    },
    [requireToken],
  );

  const verify = useCallback(
    async (otp: string) => {
      const token = requireToken();
      const session = await authApi.registerVerify({ registrationToken: token, otp });
      await completeRegistration(session);
      setEmail(null);
      setPhone(null);
      registrationTokenRef.current = null;
      setOtpDestinationMasked(null);
      setResendAvailableAt(null);
      return session;
    },
    [requireToken, completeRegistration],
  );

  const resendOtp = useCallback(async () => {
    const token = requireToken();
    const result = await authApi.registerResendOtp({ registrationToken: token });
    setResendAvailableAt(result.resendAvailableAt);
    return result.resendAvailableAt;
  }, [requireToken]);

  const value: RegisterFlowContextValue = {
    email,
    phone,
    otpDestinationMasked,
    resendAvailableAt,
    initiate,
    setPassword,
    verify,
    resendOtp,
  };

  return <RegisterFlowContext.Provider value={value}>{children}</RegisterFlowContext.Provider>;
}

export function useRegisterFlow(): RegisterFlowContextValue {
  const ctx = useContext(RegisterFlowContext);
  if (!ctx) {
    throw new Error('useRegisterFlow must be used within RegisterFlowProvider');
  }
  return ctx;
}
