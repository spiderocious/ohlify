import { createContext, useContext, useState, type ReactNode } from 'react';

interface RegisterState {
  registrationToken: string;
  otpDestinationMasked: string;
  resendAvailableAt: string;
}

interface RegisterContextValue {
  state: RegisterState | null;
  setRegisterState: (state: RegisterState) => void;
  clearRegisterState: () => void;
}

const RegisterContext = createContext<RegisterContextValue | null>(null);

export function RegisterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RegisterState | null>(null);

  return (
    <RegisterContext.Provider
      value={{
        state,
        setRegisterState: setState,
        clearRegisterState: () => setState(null),
      }}
    >
      {children}
    </RegisterContext.Provider>
  );
}

export function useRegisterContext(): RegisterContextValue {
  const ctx = useContext(RegisterContext);
  if (!ctx) throw new Error('useRegisterContext must be used within RegisterProvider');
  return ctx;
}
