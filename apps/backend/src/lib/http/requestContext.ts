import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  requestId: string;
  userId?: string;
  role?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const requestContext = {
  run: <T>(ctx: RequestContext, fn: () => T): T => storage.run(ctx, fn),
  get: (): RequestContext | undefined => storage.getStore(),
  getRequestId: (): string => storage.getStore()?.requestId ?? 'unknown',
  getUserId: (): string | undefined => storage.getStore()?.userId,
  getRole: (): string | undefined => storage.getStore()?.role,
};
