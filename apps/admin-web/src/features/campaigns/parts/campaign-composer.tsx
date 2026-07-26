import { useEffect, useState } from 'react';

import { AppButton, AppDropdownInput, AppText, AppTextAreaInput, AppTextInput } from '@ohlify/ui';
import type { SegmentPredicate } from '@ohlify/api';

import { toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { useCreateCampaign, usePreviewAudience } from '../api/use-campaigns.js';

const ROLE_OPTIONS = [
  { value: '', label: 'Everyone' },
  { value: 'client', label: 'Clients' },
  { value: 'professional', label: 'Professionals' },
];

const AGE_OPTIONS = [
  { value: '', label: 'Any account age' },
  { value: 'new7', label: 'Joined in the last 7 days' },
  { value: 'new30', label: 'Joined in the last 30 days' },
  { value: 'old30', label: 'Joined more than 30 days ago' },
];

function buildSegment(role: string, age: string): SegmentPredicate {
  const segment: SegmentPredicate = {};
  if (role === 'client' || role === 'professional') segment.role = role;
  if (age === 'new7') segment.account_age_max_days = 7;
  if (age === 'new30') segment.account_age_max_days = 30;
  if (age === 'old30') segment.account_age_min_days = 30;
  return segment;
}

/**
 * Writes a campaign and shows who it would reach.
 *
 * The audience refreshes as the predicate changes, because "how many people am
 * I about to message" is the one number worth being certain of before a send
 * that cannot be recalled after five minutes.
 */
export function CampaignComposer() {
  const create = useCreateCampaign();
  const preview = usePreviewAudience();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deeplink, setDeeplink] = useState('');
  const [role, setRole] = useState('');
  const [age, setAge] = useState('');

  const segment = buildSegment(role, age);

  // Re-measure whenever the predicate moves. The call is read-only, so firing
  // it on every change costs nothing but a query. `previewMutate` is pulled out
  // as a stable reference — depending on the whole mutation handle would loop.
  const previewMutate = preview.mutate;
  useEffect(() => {
    previewMutate(buildSegment(role, age));
  }, [role, age, previewMutate]);

  const valid = title.trim().length > 0;

  const onCreate = () => {
    create.mutate(
      {
        title: title.trim(),
        ...(body.trim() ? { body: body.trim() } : {}),
        ...(deeplink.trim() ? { deeplink: deeplink.trim() } : {}),
        segment,
      },
      {
        onSuccess: () => {
          toastSuccess('Campaign saved as a draft.');
          setTitle('');
          setBody('');
          setDeeplink('');
        },
        onError: (err) => toastError(err),
      },
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-5 py-4">
        <AppText variant="body" weight={600}>
          New campaign
        </AppText>
      </header>

      <div className="flex flex-col gap-4 px-5 py-5">
        <AppTextInput label="Title" value={title} onChange={setTitle} />
        <AppTextAreaInput label="Body" value={body} onChange={setBody} />
        <div className="flex flex-col gap-2">
          <AppTextInput label="Deeplink" value={deeplink} onChange={setDeeplink} />
          <p className="-mt-1.5 text-xs text-slate-500">
            Where tapping the notification lands, e.g. <code>wallet</code>,{' '}
            <code>profile_rates</code>, or <code>professional?professional_id=u_…</code>.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AppDropdownInput
            label="Audience"
            options={ROLE_OPTIONS}
            value={role}
            onChange={setRole}
          />
          <AppDropdownInput
            label="Account age"
            options={AGE_OPTIONS}
            value={age}
            onChange={setAge}
          />
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <AppText variant="body" weight={600}>
            {preview.isPending
              ? 'Counting…'
              : `${preview.data?.audience_size ?? 0} people match this audience`}
          </AppText>
          <span className="text-xs text-slate-500">
            Re-counted when the campaign actually sends — the set can move in five minutes.
          </span>
        </div>

        <AppButton
          label="Save draft"
          variant="solid"
          height={38}
          isLoading={create.isPending}
          onPressed={valid ? onCreate : undefined}
        />
      </div>
    </section>
  );
}
