import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { InstantCallJoin, StartInstantCallPayload } from '@ohlify/api';

/** Start an instant call (runs the backend preflight: minutes / online / DnD). */
export function useStartInstantCall() {
  return useMutation({
    mutationFn: async (payload: StartInstantCallPayload) => {
      try {
        const res = await apiClient
          .post(EP.INSTANT_CALLS, { json: payload })
          .json<{ data: InstantCallJoin }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}

/** Callee answers a ringing call → active + join creds. */
export function useAnswerInstantCall() {
  return useMutation({
    mutationFn: async (callId: string) => {
      try {
        const res = await apiClient
          .post(EP.INSTANT_CALL_ANSWER(callId))
          .json<{ data: InstantCallJoin }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}

/** End/cancel a call, reporting talk time so the backend meters + settles. */
export function useEndInstantCall() {
  return useMutation({
    mutationFn: async (input: { callId: string; connectedSeconds: number }) => {
      try {
        await apiClient
          .post(EP.INSTANT_CALL_END(input.callId), {
            json: { connected_seconds: input.connectedSeconds },
          })
          .json();
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
