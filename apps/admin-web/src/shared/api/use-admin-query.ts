import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { adminApiClient, parseApiError, type ApiError } from '@ohlify/api';

interface AdminQueryConfig<TData> {
  key: readonly unknown[];
  url: string;
  searchParams?: Readonly<Record<string, string | number | boolean | undefined | null>>;
  /** Optional projection from the response envelope. */
  select?: (raw: unknown, meta: unknown) => TData;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * GET-only counterpart to useAdminMutation. Strips `undefined`/`null`
 * search params (so callers can pass optional filters straight from form
 * state) and unwraps the `{ data, meta }` envelope.
 */
export function useAdminQuery<TData = unknown>(
  config: AdminQueryConfig<TData>,
  options?: Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<TData, ApiError>({
    queryKey: config.key,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (config.searchParams) {
        for (const [k, v] of Object.entries(config.searchParams)) {
          if (v === undefined || v === null || v === '') continue;
          params[k] = String(v);
        }
      }
      try {
        const res = await adminApiClient
          .get(config.url, Object.keys(params).length ? { searchParams: params } : undefined)
          .json<{ data: unknown; meta?: unknown }>();
        return config.select ? config.select(res.data, res.meta) : (res.data as TData);
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    enabled: config.enabled,
    staleTime: config.staleTime,
    ...options,
  });
}
