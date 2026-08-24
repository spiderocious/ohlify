import { useState } from 'react';

import type { AdminReviewView } from '@ohlify/api';
import {
  HawkBadge,
  HawkCaption,
  HawkDropdown,
  HawkRating,
  HawkSearchInput,
  HawkSemantic,
  HawkText,
  IconEyeOff,
  IconStar,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatRelative } from '../../../shared/format/datetime.js';
import { shortId } from '../../../shared/lib/labels.js';
import { useReviews } from '../api/use-reviews.js';
import { ReviewDetailDrawer } from '../parts/review-detail-drawer.js';

const RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '1', label: '1 star only' },
  { value: '2', label: '2 stars and below' },
  { value: '3', label: '3 stars and below' },
];

const VISIBILITY_TABS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Hidden' },
];

/**
 * Review moderation (A25).
 *
 * The queue is read for *bad* reviews — a one-star with text is the row that
 * gets disputed, reported, or hidden — so the rating leads and the ceiling
 * filter exists to pull the tail forward. A five-star review is never why
 * someone opens this screen.
 */
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

  const hidden = list.items.filter((row) => row.hidden_at !== null).length;
  const lowRated = list.items.filter((row) => row.rating <= 2).length;
  const average =
    list.items.length === 0
      ? null
      : list.items.reduce((sum, row) => sum + row.rating, 0) / list.items.length;

  const kpis: HawkKpi[] = [
    {
      key: 'average',
      label: 'Average on this page',
      value: average === null ? '—' : average.toFixed(2),
      icon: IconStar,
      semantic: average !== null && average < 3.5 ? 'caution' : 'success',
    },
    {
      key: 'low',
      label: 'Two stars or fewer',
      value: lowRated.toLocaleString(),
      icon: IconStar,
      semantic: lowRated > 0 ? 'caution' : 'neutral',
    },
    {
      key: 'hidden',
      label: 'Hidden by moderation',
      value: hidden.toLocaleString(),
      icon: IconEyeOff,
      semantic: hidden > 0 ? 'critical' : 'neutral',
    },
    {
      key: 'shown',
      label: 'Rows shown',
      value: list.items.length.toLocaleString(),
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminReviewView>> = [
    {
      key: 'rating',
      header: 'Rating',
      width: '13%',
      render: (row) => <HawkRating value={row.rating} readOnly size={12} />,
    },
    {
      key: 'feedback',
      header: 'Feedback',
      width: '32%',
      render: (row) => (
        <div className="flex flex-col">
          {row.feedback_text ? (
            <HawkText variant="label" clamp={2} className="leading-snug">
              {row.feedback_text}
            </HawkText>
          ) : (
            <HawkCaption ink="disabled">No text</HawkCaption>
          )}
          <HawkCaption ink="muted" className="hawk-record">
            Call {shortId(row.call_id, 14)}
          </HawkCaption>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'About',
      width: '17%',
      // The subject before the reviewer: moderation is about who was written
      // about, not who wrote.
      render: (row) => (
        <div className="flex flex-col">
          <HawkText variant="label" clamp={1}>
            {row.subject?.name ?? '—'}
          </HawkText>
          <UserLink userId={row.subject?.id} idLen={14} />
        </div>
      ),
    },
    {
      key: 'reviewer',
      header: 'By',
      width: '17%',
      render: (row) => (
        <div className="flex flex-col">
          <HawkText variant="label" clamp={1}>
            {row.reviewer?.name ?? '—'}
          </HawkText>
          <UserLink userId={row.reviewer?.id} idLen={14} />
        </div>
      ),
    },
    {
      key: 'visibility',
      header: 'Visibility',
      width: '11%',
      render: (row) =>
        row.hidden_at ? (
          <HawkBadge label="Hidden" semantic={HawkSemantic.CRITICAL} size="sm" />
        ) : (
          <HawkBadge label="Visible" semantic={HawkSemantic.SUCCESS} size="sm" />
        ),
    },
    {
      key: 'when',
      header: 'When',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{formatRelative(row.created_at)}</span>
      ),
    },
  ];

  return (
    <>
      <BoardScreen
        title="Reviews"
        subtitle="Moderate user-submitted ratings and feedback."
        kpis={kpis}
        tabs={VISIBILITY_TABS}
        activeTab={onlyHidden}
        onTabChange={setOnlyHidden}
        filters={
          <>
            <HawkDropdown
              options={RATING_OPTIONS}
              value={ratingMax}
              onChange={setRatingMax}
              placeholder="Any rating"
            />
            <div className="w-56">
              <HawkSearchInput
                value={professionalId}
                onChange={setProfessionalId}
                placeholder="Filter by professional ID"
              />
            </div>
          </>
        }
        columns={columns}
        list={list}
        rowKey={(row) => row.id}
        onRowClick={(row) => setOpenId(row.id)}
        emptyTitle="No reviews"
        emptyDescription="Nothing matches these filters."
      />

      <ReviewDetailDrawer reviewId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
