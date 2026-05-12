import { useState } from 'react';

import { AppButton, AppDropdownInput, AppText, AppTextAreaInput, AppTextInput } from '@ohlify/ui';
import { BannerAudience, type AdminBanner } from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { StatusPill } from '../../../shared/parts/status-pill.js';
import { confirm, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime } from '../../../shared/format/datetime.js';
import { humanizeStatus } from '../../../shared/lib/labels.js';
import {
  useBanners,
  useCreateBanner,
  useDeleteBanner,
  useToggleBanner,
  useUpdateBanner,
} from '../api/use-banners.js';

const AUDIENCE_OPTIONS = Object.values(BannerAudience).map((v) => ({
  label: humanizeStatus(v),
  value: v,
}));

// `placement` is an open enum on backend — we ship the common values here.
const PLACEMENT_OPTIONS = [
  { label: 'Home top', value: 'home_top' },
  { label: 'Home middle', value: 'home_middle' },
  { label: 'Wallet', value: 'wallet' },
  { label: 'Profile', value: 'profile' },
];

export function BannersScreen() {
  const list = useBanners({});
  const [draft, setDraft] = useState<Partial<AdminBanner> | null>(null);

  const columns: ColumnDef<AdminBanner>[] = [
    {
      key: 'title',
      header: 'Banner',
      width: '34%',
      render: (b) => (
        <div className="flex flex-col">
          <AppText variant="body" className="font-semibold text-text-primary">
            {b.title ?? '—'}
          </AppText>
          {b.subtitle && (
            <AppText variant="bodySmall" className="line-clamp-1 text-text-muted">
              {b.subtitle}
            </AppText>
          )}
        </div>
      ),
    },
    {
      key: 'placement',
      header: 'Placement',
      width: '14%',
      render: (b) => humanizeStatus(b.placement ?? ''),
    },
    {
      key: 'audience',
      header: 'Audience',
      width: '12%',
      render: (b) => humanizeStatus(b.audience ?? ''),
    },
    { key: 'pri', header: 'Priority', width: '10%', align: 'right', render: (b) => b.priority ?? 0 },
    {
      key: 'active',
      header: 'Active',
      width: '10%',
      render: (b) => (
        <StatusPill label={b.is_active ? 'Active' : 'Off'} tone={b.is_active ? 'success' : 'muted'} />
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      width: '20%',
      render: (b) => formatDateTime(b.updated_at),
    },
  ];

  return (
    <>
      <PageHeader
        title="Banners"
        subtitle="Marketing banners shown in mobile/web apps."
        actions={
          <AppButton
            label="New banner"
            variant="solid"
            height={36}
            onPressed={() =>
              setDraft({
                title: '',
                placement: 'home_top',
                audience: BannerAudience.ALL,
                priority: 0,
                is_active: true,
              })
            }
          />
        }
      />

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(b) => b.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No banners"
        onRowClick={(b) => setDraft(b)}
        footer={
          <CursorPagination
            hasPrev={list.hasPrev}
            hasNext={list.hasNext}
            onPrev={list.goPrev}
            onNext={list.goNext}
            itemCount={list.items.length}
          />
        }
      />

      <BannerEditor draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}

function BannerEditor({
  draft,
  onClose,
}: {
  draft: Partial<AdminBanner> | null;
  onClose: () => void;
}) {
  const create = useCreateBanner();
  const update = useUpdateBanner(draft?.id ?? '');
  const del = useDeleteBanner(draft?.id ?? '');
  const toggle = useToggleBanner(draft?.id ?? '');

  const [title, setTitle] = useState(draft?.title ?? '');
  const [subtitle, setSubtitle] = useState(draft?.subtitle ?? '');
  const [body, setBody] = useState(draft?.body ?? '');
  const [imageUrl, setImageUrl] = useState(draft?.image_url ?? '');
  const [audience, setAudience] = useState<string>(draft?.audience ?? BannerAudience.ALL);
  const [placement, setPlacement] = useState<string>(draft?.placement ?? 'home_top');
  const [priority, setPriority] = useState(String(draft?.priority ?? 0));
  const [ctaLabel, setCtaLabel] = useState(draft?.cta_label ?? '');
  const [ctaUrl, setCtaUrl] = useState(draft?.cta_url ?? '');
  const [deeplink, setDeeplink] = useState(draft?.deeplink ?? '');

  const isEdit = Boolean(draft?.id);
  const valid = title.trim().length > 0 && placement.trim().length > 0;

  const onSave = () => {
    const payload = {
      title,
      subtitle: subtitle || null,
      body: body || null,
      image_url: imageUrl || null,
      audience: audience as AdminBanner['audience'],
      placement,
      priority: Number(priority) || 0,
      cta_label: ctaLabel || null,
      cta_url: ctaUrl || null,
      deeplink: deeplink || null,
    };
    const m = isEdit ? update : create;
    m.mutate(payload, {
      onSuccess: () => {
        toastSuccess(isEdit ? 'Banner updated' : 'Banner created');
        onClose();
      },
      onError: (err) => toastError(err),
    });
  };

  const onDelete = async () => {
    if (!isEdit) return;
    if (
      !(await confirm({ title: 'Delete banner?', message: 'Cannot be undone.', destructive: true }))
    )
      return;
    del.mutate(undefined, {
      onSuccess: () => {
        toastSuccess('Banner deleted');
        onClose();
      },
      onError: (err) => toastError(err),
    });
  };

  const onToggle = () => {
    if (!isEdit) return;
    const fn = draft?.is_active ? toggle.deactivate : toggle.activate;
    fn.mutate(undefined, {
      onSuccess: () => {
        toastSuccess(draft?.is_active ? 'Deactivated' : 'Activated');
        onClose();
      },
      onError: (err) => toastError(err),
    });
  };

  return (
    <DetailDrawer
      open={Boolean(draft)}
      onClose={onClose}
      title={isEdit ? 'Edit banner' : 'New banner'}
      width={560}
      footer={
        <>
          {isEdit && (
            <AppButton
              label={draft?.is_active ? 'Deactivate' : 'Activate'}
              variant="outline"
              height={36}
              onPressed={onToggle}
            />
          )}
          {isEdit && <AppButton label="Delete" variant="outline" height={36} onPressed={onDelete} />}
          <AppButton
            label={isEdit ? 'Save' : 'Create'}
            variant="solid"
            height={36}
            isLoading={create.isPending || update.isPending}
            onPressed={valid ? onSave : undefined}
          />
        </>
      }
    >
      <div className="flex flex-col gap-3 px-5 py-4">
        <AppTextInput label="Title" value={title} onChange={setTitle} />
        <AppTextInput label="Subtitle" value={subtitle ?? ''} onChange={setSubtitle} />
        <AppTextAreaInput label="Body" value={body ?? ''} onChange={setBody} />
        <AppTextInput label="Image URL" value={imageUrl ?? ''} onChange={setImageUrl} />
        <div className="grid grid-cols-2 gap-3">
          <AppDropdownInput
            label="Audience"
            options={AUDIENCE_OPTIONS}
            value={audience}
            onChange={setAudience}
          />
          <AppDropdownInput
            label="Placement"
            options={PLACEMENT_OPTIONS}
            value={placement}
            onChange={setPlacement}
          />
        </div>
        <AppTextInput
          label="Priority"
          inputType="number"
          inputMode="numeric"
          value={priority}
          onChange={setPriority}
        />
        <AppTextInput label="CTA label" value={ctaLabel ?? ''} onChange={setCtaLabel} />
        <AppTextInput label="CTA URL" value={ctaUrl ?? ''} onChange={setCtaUrl} />
        <AppTextInput label="Deeplink" value={deeplink ?? ''} onChange={setDeeplink} />
      </div>
    </DetailDrawer>
  );
}
