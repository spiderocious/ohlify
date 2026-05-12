import { listPublicConfigRows } from '@lib/config/platform-config.service.js';
import { ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import type { PublicConfigResponse } from './platform-config.types.js';

// Returns the subset of platform_config rows marked is_public=TRUE. The
// `values` shape is a simple key→value map so clients can treat it as a
// dictionary lookup. Cold-start clients call this BEFORE auth, so the route
// is mounted public.
export const getPublicConfig = async () => {
  const rows = await listPublicConfigRows();
  const values: Record<string, unknown> = {};
  for (const row of rows) values[row.key] = row.value;
  const data: PublicConfigResponse = {
    values,
    fetched_at: new Date().toISOString(),
  };
  return new ServiceSuccess(data, MESSAGE_KEYS.CONFIG_PUBLIC_FETCHED);
};
