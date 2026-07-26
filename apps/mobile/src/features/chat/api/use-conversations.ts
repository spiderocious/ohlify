import { useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api/query-keys';

import { chatApi } from './chat-api';

const PAGE_SIZE = 20;

/**
 * The conversation list, cached and paginated.
 *
 * No polling: SSE's `chat.message` invalidates this key the moment anything
 * arrives, which is both faster than a timer and free when nothing is
 * happening. The cache is what lets the list render instantly offline.
 */
export function useConversations() {
  return useInfiniteQuery({
    queryKey: queryKeys.conversations(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      chatApi.listConversations({ limit: PAGE_SIZE, ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
