import { useState } from 'react';
import { env } from '@shared/config/env.js';

export interface MintedSession {
  session_id: string;
  channel: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  label: string | null;
  expires_at: string;
  party_a: {
    uid: number;
    agora_token: string;
    token_expires_at: string;
    name: string;
    avatar_url: string | null;
  };
  party_b: {
    uid: number;
    agora_token: string;
    token_expires_at: string;
    name: string;
    avatar_url: string | null;
  };
}

interface MintParams {
  call_type?: 'audio' | 'video';
  duration_minutes?: number;
  label?: string;
}

interface UseMintTestSession {
  mint: (params: MintParams) => Promise<MintedSession | null>;
  loading: boolean;
  error: string | null;
}

export function useMintTestSession(): UseMintTestSession {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mint = async (params: MintParams): Promise<MintedSession | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${env.VITE_BACKEND_URL}/api/v1/dev/call-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = (await res.json()) as { data?: MintedSession; error?: string };
      if (!json.data) {
        setError(json.error ?? 'Failed to create session');
        return null;
      }
      return json.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mint, loading, error };
}
