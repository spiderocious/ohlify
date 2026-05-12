import { QueryClient } from '@tanstack/react-query';

type MockResolver = () => unknown;

const registry = new Map<string, MockResolver>();

export function registerMock(queryKey: string, resolver: MockResolver) {
  registry.set(queryKey, resolver);
}

export function createMockQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: ({ queryKey }) => {
          const key = String(queryKey[0]);
          const resolver = registry.get(key);
          if (!resolver) throw new Error(`No mock registered for queryKey: ${key}`);
          return Promise.resolve(resolver());
        },
        retry: false,
        staleTime: Infinity,
      },
    },
  });
}
