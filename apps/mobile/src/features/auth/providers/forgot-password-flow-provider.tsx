import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import { authApi } from '../api/auth-api';

/**
 * Holds the in-flight forgot-password flow across three screens:
 * initiate → verify-otp → reset. Mirrors
 * mobile/lib/features/auth/providers/forgot_password_flow_notifier.dart.
 */
interface ForgotPasswordFlowContextValue {
  email: string | null;
  initiate: (email: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  reset: (newPassword: string) => Promise<void>;
}

const ForgotPasswordFlowContext = createContext<ForgotPasswordFlowContextValue | null>(null);

export function ForgotPasswordFlowProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const resetTokenRef = useRef<string | null>(null);

  const initiate = useCallback(async (nextEmail: string) => {
    await authApi.forgotPasswordInitiate({ email: nextEmail });
    setEmail(nextEmail);
    resetTokenRef.current = null;
  }, []);

  const verifyOtp = useCallback(
    async (otp: string) => {
      if (!email) {
        throw new Error('Forgot-password email missing — call initiate() first.');
      }
      const result = await authApi.forgotPasswordVerifyOtp({ email, otp });
      resetTokenRef.current = result.resetToken;
    },
    [email],
  );

  const reset = useCallback(async (newPassword: string) => {
    const token = resetTokenRef.current;
    if (!token) {
      throw new Error('Reset token missing — verifyOtp() must succeed before reset().');
    }
    await authApi.forgotPasswordReset({ resetToken: token, newPassword });
    setEmail(null);
    resetTokenRef.current = null;
  }, []);

  const value: ForgotPasswordFlowContextValue = { email, initiate, verifyOtp, reset };

  return <ForgotPasswordFlowContext.Provider value={value}>{children}</ForgotPasswordFlowContext.Provider>;
}

export function useForgotPasswordFlow(): ForgotPasswordFlowContextValue {
  const ctx = useContext(ForgotPasswordFlowContext);
  if (!ctx) {
    throw new Error('useForgotPasswordFlow must be used within ForgotPasswordFlowProvider');
  }
  return ctx;
}
