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
      isPublic?: boolean;
    }) => {
      const { callId, stars, comment, isPublic } = payload;
      // Backend schema is `.strict()` and expects { rating, feedback_text?,
      // is_public? } — not { professionalId, stars, comment }. Sending the wrong
      // field names 400s every submission. (BUGS.md M6.)
      const body: { rating: number; feedback_text?: string; is_public?: boolean } = {
        rating: stars,
      };
      if (comment !== undefined && comment.trim().length > 0) {
        body.feedback_text = comment;
      }
      if (isPublic !== undefined) {
        body.is_public = isPublic;
      }
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
