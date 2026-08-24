import { HawkAdminPageHeader, HawkCallout, HawkEmptyState, HawkSemantic } from '@ohlify/hawk-ui';

import { RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { useAppVersions } from '../api/use-app-versions.js';
import { ReleaseForm } from '../parts/release-form.js';

/**
 * Minimum accepted build per platform (A26).
 *
 * One row each for iOS and Android, seeded by migration — there is nothing to
 * create or delete, only to raise. So this is two forms rather than a list,
 * and the warning about who a raise strands is stated once at the top rather
 * than duplicated into each.
 */
export function AppReleasesScreen() {
  const versions = useAppVersions();
  const items = versions.data?.items ?? [];

  return (
    <>
      <HawkAdminPageHeader
        title="App releases"
        subtitle="Set the oldest build each platform may still run, and the prompt shown below it."
      />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        <HawkCallout
          semantic={HawkSemantic.CAUTION}
          title="Raising a minimum locks people out"
          message="Every live session below the new minimum is blocked until that user updates. The technical dashboard reports how many that would be, per platform, before you change it."
        />

        {versions.isLoading ? (
          <RowsSkeleton rows={4} />
        ) : items.length === 0 ? (
          <HawkEmptyState
            title="No platforms configured"
            description="Migration 0084 seeds iOS and Android. If this is empty, migrations have not run."
          />
        ) : (
          <div className="flex flex-col gap-hawk-6">
            {items.map((release) => (
              <ReleaseForm key={release.platform} release={release} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
