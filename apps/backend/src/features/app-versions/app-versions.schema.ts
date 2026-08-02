import { z } from 'zod';

import { AppPlatform } from './app-versions.types.js';

const PLATFORMS = [AppPlatform.IOS, AppPlatform.ANDROID, AppPlatform.WEB] as const;

/** `major.minor.patch`, with an optional pre-release/build suffix the comparison ignores. */
const VERSION_PATTERN = /^\d+(\.\d+){0,2}([-+][0-9A-Za-z.-]+)?$/;

export const CheckVersionQuerySchema = z
  .object({
    platform: z.enum(PLATFORMS),
    version: z.string().min(1).max(64),
  })
  .strict();

export type CheckVersionQueryDto = z.infer<typeof CheckVersionQuerySchema>;

export const UpsertAppVersionSchema = z
  .object({
    platform: z.enum(PLATFORMS),
    min_version: z.string().regex(VERSION_PATTERN, 'Use a version like 1.4.0'),
    forced: z.boolean(),
    store_url: z.string().url(),
    title: z.string().min(1).max(120),
    description_md: z.string().max(4000).nullable().optional(),
    illustration_key: z.string().max(512).nullable().optional(),
  })
  .strict();

export type UpsertAppVersionDto = z.infer<typeof UpsertAppVersionSchema>;
