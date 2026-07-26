import { z } from 'zod';

import { BadgeSurface } from './notifications.types.js';

export const ListNotificationsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  })
  .strict();

export type ListNotificationsQueryDto = z.infer<typeof ListNotificationsQuerySchema>;

export const SurfaceParamSchema = z.enum([
  BadgeSurface.CALLS,
  BadgeSurface.WALLET,
  BadgeSurface.CHATS,
  BadgeSurface.NOTIFICATIONS,
]);
