import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { BankDetails } from '@ohlify/core';

interface ProfileState {
  fullName: string;
  email: string;
  phone: string;
  occupation: string;
  description: string;
  interests: string[];
  bankAccount: BankDetails | null;
  smsNotifications: boolean;
  emailNotifications: boolean;
}

interface ProfileContextValue extends ProfileState {
  setFullName: (v: string) => void;
  setEmail: (v: string) => void;
  setPhone: (v: string) => void;
  setOccupation: (v: string) => void;
  setDescription: (v: string) => void;
  setInterests: (v: string[]) => void;
  setBankAccount: (v: BankDetails) => void;
  setSmsNotifications: (v: boolean) => void;
  setEmailNotifications: (v: boolean) => void;
}

/** Mirrors mobile ProfileNotifier seed (mock_service.getProfileSeed). */
const SEED: ProfileState = {
  fullName: 'Adedeji Benson Bamidele',
  email: 'adedeji_fresh@gmail.com',
  phone: '0801 234 6789',
  occupation: 'Software engineer',
  description:
    'Senior sales manager with 10+ years of experience helping founders pitch better and close more deals.',
  interests: ['Relationship', 'Technology', 'Entertainment'],
  bankAccount: {
    accountNumber: '9654519113',
    bankName: 'Moniepoint MFB',
    accountName: 'Adekunle Ifeanyi Musa',
  },
  smsNotifications: false,
  emailNotifications: true,
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProfileState>(SEED);

  const value = useMemo<ProfileContextValue>(
    () => ({
      ...state,
      setFullName: (v) => setState((s) => ({ ...s, fullName: v })),
      setEmail: (v) => setState((s) => ({ ...s, email: v })),
      setPhone: (v) => setState((s) => ({ ...s, phone: v })),
      setOccupation: (v) => setState((s) => ({ ...s, occupation: v })),
      setDescription: (v) => setState((s) => ({ ...s, description: v })),
      setInterests: (v) => setState((s) => ({ ...s, interests: v })),
      setBankAccount: (v) => setState((s) => ({ ...s, bankAccount: v })),
      setSmsNotifications: (v) => setState((s) => ({ ...s, smsNotifications: v })),
      setEmailNotifications: (v) => setState((s) => ({ ...s, emailNotifications: v })),
    }),
    [state],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
