import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type ClientKycItem = 'fullName' | 'interests' | 'description';

export const CLIENT_KYC_ITEMS: ReadonlyArray<ClientKycItem> = [
  'fullName',
  'interests',
  'description',
];

export const CLIENT_KYC_TITLES: Record<ClientKycItem, string> = {
  fullName: 'Full name',
  interests: 'Interests',
  description: 'Description',
};

export const CLIENT_KYC_SUBTITLES: Record<ClientKycItem, string> = {
  fullName: 'Enter your full legal name as it appears on ID.',
  interests: 'Pick topics so we can recommend the right people for you.',
  description:
    'A short intro about who you are so professionals know who they are speaking with.',
};

interface ClientKycState {
  fullName: string | null;
  description: string | null;
  interests: string[];
}

interface ClientKycContextValue extends ClientKycState {
  setFullName: (v: string) => void;
  setDescription: (v: string) => void;
  setInterests: (v: string[]) => void;
  isComplete: (item: ClientKycItem) => boolean;
  completedCount: number;
  completionPercent: number;
}

const ClientKycContext = createContext<ClientKycContextValue | null>(null);

export function ClientKycProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClientKycState>({
    fullName: null,
    description: null,
    interests: [],
  });

  const value = useMemo<ClientKycContextValue>(() => {
    const isComplete = (item: ClientKycItem): boolean => {
      switch (item) {
        case 'fullName':
          return state.fullName !== null && state.fullName !== '';
        case 'description':
          return state.description !== null && state.description !== '';
        case 'interests':
          return state.interests.length > 0;
      }
    };

    const completedCount = CLIENT_KYC_ITEMS.filter(isComplete).length;
    const completionPercent = Math.round((completedCount / CLIENT_KYC_ITEMS.length) * 100);

    return {
      ...state,
      setFullName: (v) => setState((s) => ({ ...s, fullName: v })),
      setDescription: (v) => setState((s) => ({ ...s, description: v })),
      setInterests: (v) => setState((s) => ({ ...s, interests: v })),
      isComplete,
      completedCount,
      completionPercent,
    };
  }, [state]);

  return <ClientKycContext.Provider value={value}>{children}</ClientKycContext.Provider>;
}

export function useClientKyc(): ClientKycContextValue {
  const ctx = useContext(ClientKycContext);
  if (!ctx) throw new Error('useClientKyc must be used inside ClientKycProvider');
  return ctx;
}
