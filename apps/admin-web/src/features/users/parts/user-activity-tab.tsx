import {
  HawkAdminPanel,
  HawkBadge,
  HawkCaption,
  HawkKeyValue,
  HawkRating,
  HawkSemantic,
  HawkStatusBadge,
  HawkTable,
  HawkText,
  IconEyeOff,
  IconPhone,
  IconVideo,
  formatKobo,
  type HawkColumn,
} from '@ohlify/hawk-ui';

import type {
  AdminUserCall,
  AdminUserDetail,
  AdminUserReview,
  AdminUserTicket,
} from '@ohlify/api';
import { absoluteTime, formatDuration, relativeTime, statusFor } from './user-status.js';

/**
 * Activity — what this account has actually done.
 *
 * Calls, reviews, chat volume and support history. Chat is reported as a
 * *volume*, never as contents: an operator does not need to read private
 * messages to answer "are these two talking?", and a surface that shows them
 * by default is one that gets misused.
 */
export function UserActivityTab({ user }: { user: AdminUserDetail }) {
  const callColumns: ReadonlyArray<HawkColumn<AdminUserCall>> = [
    {
      key: 'reference',
      header: 'Call',
      width: '14%',
      render: (row) => <span className="hawk-record">{row.id}</span>,
    },
    {
      key: 'counterparty',
      header: 'With',
      width: '20%',
      render: (row) => (
        <span className="flex items-center gap-hawk-3">
          {/* Direction as a glyph rather than a word: it is a property of the
              call, not a column anyone scans down. */}
          <HawkBadge
            label={row.direction === 'incoming' ? 'In' : 'Out'}
            semantic={HawkSemantic.NEUTRAL}
            size="sm"
          />
          <span>{row.counterparty_name ?? '—'}</span>
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '12%',
      render: (row) => (
        <span className="flex items-center gap-hawk-2 text-hawk-ink-muted">
          {row.call_type === 'video' ? <IconVideo size={13} /> : <IconPhone size={13} />}
          <HawkCaption>{row.call_type}</HawkCaption>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Outcome',
      width: '14%',
      render: (row) => <HawkStatusBadge status={statusFor('call', row.status)} size="sm" />,
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      width: '14%',
      render: (row) => (
        <span className="hawk-record">{formatDuration(row.connected_seconds)}</span>
      ),
    },
    {
      key: 'settled',
      header: 'Settled',
      align: 'right',
      width: '14%',
      render: (row) => (
        <span className="hawk-record">
          {Number(row.settled_kobo) === 0 ? '—' : formatKobo(row.settled_kobo)}
        </span>
      ),
    },
    {
      key: 'when',
      header: 'When',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{relativeTime(row.created_at)}</span>
      ),
    },
  ];

  const ticketColumns: ReadonlyArray<HawkColumn<AdminUserTicket>> = [
    {
      key: 'id',
      header: 'Ticket',
      width: '16%',
      render: (row) => <span className="hawk-record">{row.id}</span>,
    },
    { key: 'subject', header: 'Subject', render: (row) => row.subject },
    {
      key: 'status',
      header: 'Status',
      width: '16%',
      render: (row) => (
        <HawkBadge
          label={row.status}
          semantic={row.status === 'resolved' ? HawkSemantic.SUCCESS : HawkSemantic.CAUTION}
          size="sm"
        />
      ),
    },
    {
      key: 'when',
      header: 'Opened',
      align: 'right',
      width: '20%',
      render: (row) => <span className="hawk-record">{absoluteTime(row.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-hawk-6">
      <HawkAdminPanel title="Calls" flush>
        <HawkTable
          bare
          columns={callColumns}
          rows={user.calls}
          rowKey={(row) => row.id}
          emptyTitle="No calls"
          emptyDescription="This account has never been on a call."
        />
      </HawkAdminPanel>

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Reviews received" className="lg:col-span-2">
          <div className="flex flex-col gap-hawk-5">
            {user.reviews.length === 0 ? (
              <HawkCaption ink="disabled">No reviews yet.</HawkCaption>
            ) : (
              user.reviews.map((review) => <ReviewRow key={review.id} review={review} />)
            )}
          </div>
        </HawkAdminPanel>

        <HawkAdminPanel title="Chat">
          <div className="flex flex-col gap-hawk-4">
            <HawkKeyValue label="Conversations" value={user.chat.conversations} record />
            <HawkKeyValue
              label="Messages sent"
              value={user.chat.messages_sent.toLocaleString()}
              record
            />
            <HawkKeyValue
              label="Last message"
              value={relativeTime(user.chat.last_message_at)}
              record
            />
            {/*
              Volume only. Reading private messages is not something an
              operator should be able to do by accident, and every question
              this panel exists to answer is answerable from counts.
            */}
            <HawkCaption ink="muted" className="leading-snug">
              Volume only — message contents are not shown here.
            </HawkCaption>
          </div>
        </HawkAdminPanel>
      </div>

      <HawkAdminPanel title="Support tickets" flush>
        <HawkTable
          bare
          columns={ticketColumns}
          rows={user.tickets}
          rowKey={(row) => row.id}
          emptyTitle="No tickets"
          emptyDescription="This user has never contacted support."
        />
      </HawkAdminPanel>
    </div>
  );
}

/**
 * A review, with its moderation state visible.
 *
 * A hidden review still counts toward nothing and is still evidence of
 * something, so it is shown dimmed and labelled rather than filtered out — an
 * operator investigating a complaint needs to know it existed.
 */
function ReviewRow({ review }: { review: AdminUserReview }) {
  return (
    <div className="flex flex-col gap-hawk-2 border-b border-hawk-line pb-hawk-5 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-hawk-3">
        <span className="flex items-center gap-hawk-3">
          <HawkText variant="label" ink="strong" className="font-medium">
            {review.reviewer_name ?? 'Anonymous'}
          </HawkText>
          <HawkRating value={review.rating} readOnly size={12} />
          {review.hidden && (
            <span className="flex items-center gap-hawk-2 text-hawk-ink-muted">
              <IconEyeOff size={12} />
              <HawkCaption>Hidden</HawkCaption>
            </span>
          )}
        </span>
        <HawkCaption ink="disabled" className="hawk-record">
          {relativeTime(review.created_at)}
        </HawkCaption>
      </div>
      {review.feedback && (
        <HawkText
          variant="caption"
          ink={review.hidden ? 'disabled' : 'muted'}
          className="leading-relaxed"
        >
          {review.feedback}
        </HawkText>
      )}
    </div>
  );
}
