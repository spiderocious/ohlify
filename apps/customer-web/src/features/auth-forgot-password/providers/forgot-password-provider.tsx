import { createContext, useContext, useState, type ReactNode } from 'react';

interface ForgotPasswordState {
  email: string;
  resetToken: string;
}

interface ForgotPasswordContextValue {
  state: ForgotPasswordState | null;
  setEmail: (email: string) => void;
  setResetToken: (email: string, resetToken: string) => void;
  clearState: () => void;
}

const ForgotPasswordContext = createContext<ForgotPasswordContextValue | null>(null);

export function ForgotPasswordProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ForgotPasswordState | null>(null);

  return (
    <ForgotPasswordContext.Provider
      value={{
        state,
        setEmail: (email) => setState({ email, resetToken: '' }),
        setResetToken: (email, resetToken) => setState({ email, resetToken }),
        clearState: () => setState(null),
      }}
    >
      {children}
    </ForgotPasswordContext.Provider>
  );
}

export function useForgotPasswordContext(): ForgotPasswordContextValue {
  const ctx = useContext(ForgotPasswordContext);
  if (!ctx) throw new Error('useForgotPasswordContext must be used within ForgotPasswordProvider');
  return ctx;
}
