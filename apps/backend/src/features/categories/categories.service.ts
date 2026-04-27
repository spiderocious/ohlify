import { ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './categories.repo.js';
import type { CategoryRow, CategoryView } from './categories.types.js';

const ALL_PSEUDO_CATEGORY: CategoryView = {
  value: 'all',
  label: 'All',
  icon_url: null,
};

const toView = (row: CategoryRow): CategoryView => ({
  value: row.value,
  label: row.label,
  icon_url: row.icon_url,
});

// Spec note (api-needed.md §7.1): the synthetic `all` is server-provided so the
// client never hardcodes it. Always prepended to the seeded list.
export const listAll = async () => {
  const rows = await repo.findAllActive();
  const list: CategoryView[] = [ALL_PSEUDO_CATEGORY, ...rows.map(toView)];
  return new ServiceSuccess(list, MESSAGE_KEYS.CATEGORIES_LIST_FETCHED);
};

export const fingerprint = async (): Promise<string> => repo.fingerprint();

// Exposed for cross-feature use (e.g. /home inlining categories without a
// double DB hit).
export const listAllRaw = async (): Promise<CategoryView[]> => {
  const rows = await repo.findAllActive();
  return [ALL_PSEUDO_CATEGORY, ...rows.map(toView)];
};
