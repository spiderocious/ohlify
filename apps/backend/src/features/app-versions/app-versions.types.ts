export const AppPlatform = {
  IOS: 'ios',
  ANDROID: 'android',
} as const;

export type AppPlatform = (typeof AppPlatform)[keyof typeof AppPlatform];

export const UpgradeStatus = {
  /** Installed build is current enough. Nothing to show. */
  OK: 'ok',
  /** Below the minimum, but dismissible. */
  OPTIONAL: 'optional',
  /** Below the minimum and blocking. */
  FORCED: 'forced',
} as const;

export type UpgradeStatus = (typeof UpgradeStatus)[keyof typeof UpgradeStatus];

export interface AppVersionRow {
  platform: AppPlatform;
  min_version: string;
  forced: boolean;
  store_url: string;
  title: string;
  description_md: string | null;
  illustration_key: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AppVersionCheckView {
  status: UpgradeStatus;
  min_version: string;
  store_url: string;
  title: string;
  /** Markdown. The client renders it — links and emphasis are intentional. */
  description_md: string | null;
  illustration_key: string | null;
}

export interface AppVersionAdminView {
  platform: AppPlatform;
  min_version: string;
  forced: boolean;
  store_url: string;
  title: string;
  description_md: string | null;
  illustration_key: string | null;
  updated_by: string | null;
  updated_at: string;
}
