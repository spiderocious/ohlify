import { ServiceSuccess } from '@lib/service-result.js';

import { APP_VERSION_MESSAGES } from './app-versions.messages.js';
import * as repo from './app-versions.repo.js';
import type { CheckVersionQueryDto, UpsertAppVersionDto } from './app-versions.schema.js';
import { isOlderThan } from './semver.js';
import {
  UpgradeStatus,
  type AppVersionAdminView,
  type AppVersionCheckView,
  type AppVersionRow,
} from './app-versions.types.js';

const toAdminView = (row: AppVersionRow): AppVersionAdminView => ({
  platform: row.platform,
  min_version: row.min_version,
  forced: row.forced,
  store_url: row.store_url,
  title: row.title,
  description_md: row.description_md,
  illustration_key: row.illustration_key,
  updated_by: row.updated_by,
  updated_at: row.updated_at.toISOString(),
});

const OK_VIEW: AppVersionCheckView = {
  status: UpgradeStatus.OK,
  min_version: '0.0.0',
  store_url: '',
  title: '',
  description_md: null,
  illustration_key: null,
};

/**
 * Does this build still meet the minimum for its platform?
 *
 * **Fails open in every uncertain case** — no row configured, an unparseable
 * version string, an unknown platform. This endpoint is the only channel that
 * can tell a user how to escape a bad release, so a mistake here has to leave
 * people in the app rather than shut out of it.
 */
export const checkVersion = async (dto: CheckVersionQueryDto) => {
  const row = await repo.findByPlatform(dto.platform);
  if (!row || !isOlderThan(dto.version, row.min_version)) {
    return new ServiceSuccess(OK_VIEW, APP_VERSION_MESSAGES.CHECKED);
  }

  return new ServiceSuccess(
    {
      status: row.forced ? UpgradeStatus.FORCED : UpgradeStatus.OPTIONAL,
      min_version: row.min_version,
      store_url: row.store_url,
      title: row.title,
      description_md: row.description_md,
      illustration_key: row.illustration_key,
    },
    APP_VERSION_MESSAGES.CHECKED,
  );
};

export const listVersions = async () => {
  const rows = await repo.listAll();
  return new ServiceSuccess({ items: rows.map(toAdminView) }, APP_VERSION_MESSAGES.LISTED);
};

export const saveVersion = async (dto: UpsertAppVersionDto, adminId: string) => {
  const row = await repo.upsert({
    platform: dto.platform,
    minVersion: dto.min_version,
    forced: dto.forced,
    storeUrl: dto.store_url,
    title: dto.title,
    descriptionMd: dto.description_md ?? null,
    illustrationKey: dto.illustration_key ?? null,
    updatedBy: adminId === 'adm_stub' ? null : adminId,
  });
  return new ServiceSuccess(toAdminView(row), APP_VERSION_MESSAGES.SAVED);
};
