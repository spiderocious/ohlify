import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useSubmitTicket() {
  return useMutation({
    mutationFn: async (payload: {
      subject: string;
      message: string;
      attachments?: string[];
    }) => {
      try {
        await apiClient.post(EP.HELP_TICKETS, { json: payload });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
