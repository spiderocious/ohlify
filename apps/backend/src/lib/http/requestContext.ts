import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  requestId: string;
  userId?: string | undefined;
  role?: string | undefined;
  adminId?: string | undefined;
  adminRole?: string | undefined;
  method?: string | undefined;
  path?: string | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
  // Monotonic ms timestamp captured at request entry. Used by the response
  // logger to compute duration without trusting wall-clock drift.
  startedAt?: number | undefined;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const requestContext = {
  run: <T>(ctx: RequestContext, fn: () => T): T => storage.run(ctx, fn),
  get: (): RequestContext | undefined => storage.getStore(),
  getRequestId: (): string => storage.getStore()?.requestId ?? 'unknown',
  getUserId: (): string | undefined => storage.getStore()?.userId,
  getRole: (): string | undefined => storage.getStore()?.role,
  getAdminId: (): string | undefined => storage.getStore()?.adminId,
};
