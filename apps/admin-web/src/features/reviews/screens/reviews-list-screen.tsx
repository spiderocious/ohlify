import { useState } from 'react';

import { AppDropdownInput, AppText, AppTextInput } from '@ohlify/ui';
import type { AdminReviewView } from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { FilterTabs, type FilterTabOption } from '../../../shared/parts/filter-tabs.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { StatusPill } from '../../../shared/parts/status-pill.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatRelative } from '../../../shared/format/datetime.js';
import { shortId } from '../../../shared/lib/labels.js';
import { useReviews } from '../api/use-reviews.js';
import { ReviewDetailDrawer } from '../parts/review-detail-drawer.js';
import { StarRating } from '../parts/star-rating.js';

const RATING_OPTIONS = [
  { label: 'Any rating', value: '' },
  { label: '≤ 1 star', value: '1' },
  { label: '≤ 2 stars', value: '2' },
  { label: '≤ 3 stars', value: '3' },
  { label: '≤ 4 stars', value: '4' },
];

const VISIBILITY_TABS: FilterTabOption[] = [
  { label: 'All', value: '' },
  { label: 'Visible', value: 'false' },
  { label: 'Hidden', value: 'true' },
];

export function ReviewsListScreen() {
  const [ratingMax, setRatingMax] = useState('');
  const [onlyHidden, setOnlyHidden] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useReviews({
    rating_max: ratingMax,
    only_hidden: onlyHidden,
    professional_id: professionalId,
  });

  const columns: ColumnDef<AdminReviewView>[] = [
    {
      key: 'rating',
      header: 'Rating',
      width: '14%',
      render: (r) => <StarRating value={r.rating} />,
    },
    {
      key: 'feedback',
      header: 'Feedback',
      width: '36%',
      render: (r) => (
        <div className="flex flex-col">
          <AppText variant="body" className="line-clamp-2 text-text-primary">
            {r.feedback_text ?? <span className="text-text-muted">No text</span>}
          </AppText>
          <AppText variant="bodySmall" className="text-text-muted">
            Call {shortId(r.call_id, 14)}
          </AppText>
        </div>
      ),
    },
    {
      key: 'reviewer',
      header: 'Reviewer',
      width: '16%',
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-text-primary">{r.reviewer?.name ?? '—'}</span>
          <UserLink userId={r.reviewer?.id} idLen={14} />
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      width: '16%',
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-text-primary">{r.subject?.name ?? '—'}</span>
          <UserLink userId={r.subject?.id} idLen={14} />
        </div>
      ),
    },
    {
      key: 'visibility',
      header: 'Visibility',
      width: '10%',
      render: (r) =>
        r.hidden_at ? (
          <StatusPill label="Hidden" tone="danger" />
        ) : (
          <StatusPill label="Visible" tone="success" />
        ),
    },
    {
      key: 'when',
      header: 'When',
      width: '8%',
      render: (r) => <span className="text-text-muted">{formatRelative(r.created_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Reviews" subtitle="Moderate user-submitted ratings + feedback." />

      <FilterBar>
        <FilterTabs
          options={VISIBILITY_TABS}
          value={onlyHidden}
          onChange={setOnlyHidden}
          label="Visibility"
        />
        <div className="sm:w-44">
          <AppDropdownInput
            label="Rating ceiling"
            options={RATING_OPTIONS}
            value={ratingMax}
            onChange={setRatingMax}
          />
        </div>
        <div className="sm:w-72">
          <AppTextInput
            label="Professional ID"
            placeholder="user uuid"
            value={professionalId}
            onChange={setProfessionalId}
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(r) => r.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No reviews"
        onRowClick={(r) => setOpenId(r.id)}
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

      <ReviewDetailDrawer reviewId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
