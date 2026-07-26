import { apiClient } from '@shared/api/api-client';

export const UpgradeStatus = {
  OK: 'ok',
  OPTIONAL: 'optional',
  FORCED: 'forced',
} as const;

export type UpgradeStatus = (typeof UpgradeStatus)[keyof typeof UpgradeStatus];

export interface AppVersionCheck {
  status: UpgradeStatus;
  minVersion: string;
  storeUrl: string;
  title: string;
  descriptionMd: string | null;
  illustrationKey: string | null;
}

function appVersionCheckFromJson(json: Record<string, unknown>): AppVersionCheck {
  return {
    status: (json.status as UpgradeStatus) ?? UpgradeStatus.OK,
    minVersion: (json.min_version as string) ?? '0.0.0',
    storeUrl: (json.store_url as string) ?? '',
    title: (json.title as string) ?? '',
    descriptionMd: (json.description_md as string) ?? null,
    illustrationKey: (json.illustration_key as string) ?? null,
  };
}

/**
 * Unauthenticated by design — this runs at cold start, before any session is
 * restored, and it is the one call that still answers while every other
 * capability is switched off.
 */
export const appVersionApi = {
  async check(params: { platform: string; version: string }): Promise<AppVersionCheck> {
    return apiClient.get('app-version', {
      queryParams: { platform: params.platform, version: params.version },
      skipAuth: true,
      fromJson: (data) => appVersionCheckFromJson(data as Record<string, unknown>),
    }) as Promise<AppVersionCheck>;
  },
};
