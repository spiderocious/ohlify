import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { useAppVersions } from '../api/use-app-versions.js';
import { ReleaseForm } from '../parts/release-form.js';

/**
 * Minimum accepted build per platform.
 *
 * One row each for iOS and Android, seeded by migration — there is nothing to
 * create or delete, only to raise, so this is two forms rather than a list.
 */
export function AppReleasesScreen() {
  const versions = useAppVersions();
  const items = versions.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="App releases"
        subtitle="Set the oldest build each platform may still run, and the prompt shown below it."
      />
      <QueryView
        isLoading={versions.isLoading}
        error={versions.error}
        isEmpty={items.length === 0}
        emptyTitle="No platforms configured"
        emptyDescription="Migration 0084 seeds iOS and Android. If this is empty, migrations have not run."
      >
        <div className="flex flex-col gap-5">
          {items.map((release) => (
            <ReleaseForm key={release.platform} release={release} />
          ))}
        </div>
      </QueryView>
    </>
  );
}
