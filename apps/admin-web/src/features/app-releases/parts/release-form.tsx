import { useEffect, useState } from 'react';

import { AppButton, AppText, AppTextAreaInput, AppTextInput } from '@ohlify/ui';
import type { AdminAppVersion } from '@ohlify/api';

import { toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { useSaveAppVersion, type AppVersionWrite } from '../api/use-app-versions.js';

const VERSION_PATTERN = /^\d+(\.\d+){0,2}$/;

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
};

function FieldHint({ children }: { children: string }) {
  return <p className="-mt-1.5 text-xs text-slate-500">{children}</p>;
}

export function ReleaseForm({ release }: { release: AdminAppVersion }) {
  const save = useSaveAppVersion();

  const [minVersion, setMinVersion] = useState(release.min_version);
  const [forced, setForced] = useState(release.forced);
  const [storeUrl, setStoreUrl] = useState(release.store_url);
  const [title, setTitle] = useState(release.title);
  const [description, setDescription] = useState(release.description_md ?? '');

  // Re-seed when the server row changes, so a save elsewhere doesn't leave
  // this form showing stale values it would then write back.
  useEffect(() => {
    setMinVersion(release.min_version);
    setForced(release.forced);
    setStoreUrl(release.store_url);
    setTitle(release.title);
    setDescription(release.description_md ?? '');
  }, [release]);

  const versionValid = VERSION_PATTERN.test(minVersion.trim());
  const valid = versionValid && storeUrl.trim().length > 0 && title.trim().length > 0;
  const dirty =
    minVersion !== release.min_version ||
    forced !== release.forced ||
    storeUrl !== release.store_url ||
    title !== release.title ||
    description !== (release.description_md ?? '');

  const onSave = () => {
    const payload: AppVersionWrite = {
      platform: release.platform,
      min_version: minVersion.trim(),
      forced,
      store_url: storeUrl.trim(),
      title: title.trim(),
      description_md: description.trim() === '' ? null : description,
    };
    save.mutate(payload, {
      onSuccess: () => toastSuccess(`${PLATFORM_LABELS[release.platform]} release saved`),
      onError: (err) => toastError(err),
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <AppText variant="body" weight={600}>
          {PLATFORM_LABELS[release.platform] ?? release.platform}
        </AppText>
        <AppButton
          label="Save"
          variant="solid"
          height={36}
          isLoading={save.isPending}
          onPressed={valid && dirty ? onSave : undefined}
        />
      </header>

      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="flex flex-col gap-2">
          <AppTextInput
            label="Minimum version"
            value={minVersion}
            onChange={setMinVersion}
            errorMessage={
              minVersion.length > 0 && !versionValid ? 'Use a version like 1.4.0' : undefined
            }
          />
          <FieldHint>Builds below this see the prompt. Leave at 0.0.0 to gate nobody.</FieldHint>
        </div>

        <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            checked={forced}
            onChange={(e) => setForced(e.target.checked)}
            className="mt-1 h-4 w-4 accent-slate-900"
          />
          <span className="flex flex-col gap-1">
            <AppText variant="body" weight={600}>
              Force the update
            </AppText>
            <span className="text-xs leading-relaxed text-slate-500">
              The prompt cannot be dismissed and the app is unusable until they update. Check the
              store listing is live first — a forced gate pointing at a build nobody can download
              strands every user below the minimum.
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <AppTextInput label="Store URL" value={storeUrl} onChange={setStoreUrl} />
          <FieldHint>
            Where “Update now” sends them. Point this at an internal download page while testing.
          </FieldHint>
        </div>

        <AppTextInput label="Title" value={title} onChange={setTitle} />

        <div className="flex flex-col gap-2">
          <AppTextAreaInput label="Description" value={description} onChange={setDescription} />
          <FieldHint>Markdown: **bold**, *italic*, [links](https://…), and - bullets.</FieldHint>
        </div>
      </div>
    </section>
  );
}
