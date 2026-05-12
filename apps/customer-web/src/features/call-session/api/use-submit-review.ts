import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      callId: string;
      professionalId: string;
      stars: number;
      comment?: string;
    }) => {
      const { callId, professionalId, ...body } = payload;
      try {
        await apiClient.post(EP.CALL_RATING(callId), { json: body });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['professional-reviews', vars.professionalId] });
      void qc.invalidateQueries({ queryKey: ['professional', vars.professionalId] });
    },
  });
}
