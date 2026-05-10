import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { adminApiClient, parseApiError, type ApiError } from '@ohlify/api';

type Method = 'post' | 'patch' | 'put' | 'delete';

interface AdminMutationConfig<TVars, TData> {
  method: Method;
  /** Either a fixed URL or a function that builds one from the variables. */
  url: string | ((vars: TVars) => string);
  /** Optional projection to extract data from the response envelope. */
  select?: (raw: unknown) => TData;
}

/**
 * Thin wrapper around `useMutation` that:
 *   - calls the admin ky client (auth header + 401 refresh handled there)
 *   - unwraps the standard `{ data }` envelope
 *   - normalizes errors via `parseApiError` so screens always get a typed
 *     `ApiError` to switch on
 *
 * Screens that need bespoke logic (file upload, custom headers) can drop
 * this and use `adminApiClient` directly — but most CRUD actions look the
 * same so this kills boilerplate.
 */
export function useAdminMutation<TVars = void, TData = unknown>(
  config: AdminMutationConfig<TVars, TData>,
  options?: Omit<UseMutationOptions<TData, ApiError, TVars>, 'mutationFn'>,
) {
  return useMutation<TData, ApiError, TVars>({
    mutationFn: async (vars: TVars) => {
      const url = typeof config.url === 'function' ? config.url(vars) : config.url;
      const isBodyless = vars === undefined || vars === null;
      try {
        const res = await adminApiClient[config.method](url, isBodyless ? undefined : { json: vars }).json<{
          data: unknown;
        }>();
        return (config.select ? config.select(res.data) : (res.data as TData));
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    ...options,
  });
}
