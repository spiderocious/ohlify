import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError, session, type OnboardingSetRoleResponse } from '@ohlify/api';

/**
 * `POST /onboarding/role` flips `users.role` in the DB AND re-mints the
 * access + refresh tokens because the role is baked into the JWT
 * payload (`requireRole` middleware reads it from there, not the DB).
 *
 * Tokens are saved INSIDE `mutationFn` — before React Query fires
 * `onSuccess` — so any navigation or prefetch that runs in `onSuccess`
 * already sees the fresh JWT in storage. The server only includes
 * `tokens` when the role actually changed; on a no-op same-role call
 * the existing token stays valid and we don't touch storage.
 *
 * See docs/role-jwt-stale-handoff.md.
 */
export function useSelectRole() {
  return useMutation({
    mutationFn: async (payload: { role: 'client' | 'professional' }) => {
      try {
        const res = await apiClient
          .post(EP.ONBOARDING_ROLE, { json: payload })
          .json<{ data: OnboardingSetRoleResponse }>();
        if (res.data.tokens) session.save(res.data.tokens);
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
