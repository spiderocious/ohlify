import { useState } from 'react';
import { env } from '@shared/config/env.js';

export interface TestPartyView {
  session_id: string;
  channel: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  uid: number;
  agora_token: string;
  token_expires_at: string;
  peer_uid: number;
}

interface UseGetTestSession {
  get: (sessionId: string, party: 'a' | 'b') => Promise<TestPartyView | null>;
  loading: boolean;
  error: string | null;
}

export function useGetTestSession(): UseGetTestSession {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const get = async (sessionId: string, party: 'a' | 'b'): Promise<TestPartyView | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${env.VITE_BACKEND_URL}/api/v1/dev/call-sessions/${sessionId}/${party}`);
      const json = (await res.json()) as { data?: TestPartyView; error?: string };
      if (!json.data) {
        setError(json.error ?? 'Not found');
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

  return { get, loading, error };
}
