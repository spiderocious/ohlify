import {
  HawkAdminPanel,
  HawkBadge,
  HawkCallout,
  HawkCaption,
  HawkKeyValue,
  HawkSemantic,
  HawkStatusBadge,
  HawkTable,
  HawkText,
  type HawkColumn,
} from '@ohlify/hawk-ui';

import { FilePreview } from '../../../shared/parts/file-preview.js';
import type {
  AdminUserAction,
  AdminUserDetail,
  AdminUserReport,
  AdminUserStrike,
} from '@ohlify/api';
import { absoluteTime, relativeTime, statusFor } from './user-status.js';

/**
 * Trust — KYC, strikes, reports, and what operators have done to this account.
 *
 * The KYC block leads because it is the gate everything else depends on: an
 * unverified professional cannot earn, and a rejected one is usually the reason
 * a ticket was opened.
 */
export function UserTrustTab({ user }: { user: AdminUserDetail }) {
  const kyc = user.kyc_submission;
  const kycExtra = user.kyc_extra;
  const strikeColumns: ReadonlyArray<HawkColumn<AdminUserStrike>> = [
    {
      key: 'reason',
      header: 'Reason',
      width: '22%',
      render: (row) => <span className="hawk-record">{row.reason_code.replace(/_/g, ' ')}</span>,
    },
    { key: 'description', header: 'Detail', render: (row) => row.description ?? '—' },
    {
      key: 'status',
      header: 'Status',
      width: '14%',
      render: (row) => <HawkStatusBadge status={statusFor('strike', row.status)} size="sm" />,
    },
    {
      key: 'call',
      header: 'Call',
      width: '14%',
      render: (row) => <span className="hawk-record">{row.related_call_id ?? '—'}</span>,
    },
    {
      key: 'when',
      header: 'Issued',
      align: 'right',
      width: '16%',
      render: (row) => <span className="hawk-record">{relativeTime(row.created_at)}</span>,
    },
  ];

  const reportColumns: ReadonlyArray<HawkColumn<AdminUserReport>> = [
    {
      key: 'direction',
      header: 'Direction',
      width: '14%',
      render: (row) => (
        // Filed-vs-received is the whole meaning of a report row. A user who
        // files many and receives none reads very differently from the reverse.
        <HawkBadge
          label={row.direction === 'filed' ? 'Filed' : 'Received'}
          semantic={row.direction === 'received' ? HawkSemantic.CAUTION : HawkSemantic.NEUTRAL}
          size="sm"
        />
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      width: '22%',
      render: (row) => <span className="hawk-record">{row.reason_code.replace(/_/g, ' ')}</span>,
    },
    { key: 'counterparty', header: 'Counterparty', render: (row) => row.counterparty_name ?? '—' },
    {
      key: 'status',
      header: 'Status',
      width: '14%',
      render: (row) => <HawkStatusBadge status={statusFor('report', row.status)} size="sm" />,
    },
    {
      key: 'when',
      header: 'When',
      align: 'right',
      width: '16%',
      render: (row) => <span className="hawk-record">{relativeTime(row.created_at)}</span>,
    },
  ];

  const actionColumns: ReadonlyArray<HawkColumn<AdminUserAction>> = [
    {
      key: 'action',
      header: 'Action',
      width: '22%',
      render: (row) => <span className="hawk-record">{row.action.replace(/[._]/g, ' ')}</span>,
    },
    { key: 'actor', header: 'Operator', width: '24%', render: (row) => row.actor },
    { key: 'note', header: 'Note', render: (row) => row.note ?? '—' },
    {
      key: 'when',
      header: 'When',
      align: 'right',
      width: '20%',
      render: (row) => <span className="hawk-record">{absoluteTime(row.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-hawk-6">
      <HawkAdminPanel
        title="KYC"
        actions={<HawkStatusBadge status={statusFor('kyc', user.kyc_status)} size="sm" />}
      >
        <div className="flex flex-col gap-hawk-5">
          <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
            <HawkKeyValue
              label="Identity type"
              value={kyc?.identity_type?.toUpperCase() ?? '—'}
              record
            />
            {/*
              Masked by default. An admin reviewing a queue does not need the
              full NIN on screen, and a number that is visible in a screenshot
              is a number that has leaked.
            */}
            <HawkKeyValue label="Identity number" value={kyc?.identity_number ?? '—'} record />
            <HawkKeyValue label="Submitted" value={absoluteTime(kyc?.created_at ?? null)} record />
            <HawkKeyValue label="Reviewed" value={absoluteTime(kyc?.reviewed_at ?? null)} record />
            <HawkKeyValue label="Reviewed by" value={kyc?.reviewed_by ?? '—'} record />
            <HawkKeyValue
              label="Submissions"
              value={kycExtra.submission_count}
              record
            />
          </div>

          {/*
            A resubmission loop is a signal in itself: three attempts usually
            means the rejection reason was never clear to the user, which is a
            product problem rather than a fraud one.
          */}
          {kycExtra.submission_count > 2 && (
            <HawkCallout
              semantic={HawkSemantic.CAUTION}
              title={`${kycExtra.submission_count} submissions`}
              message="Repeated attempts usually mean the rejection reason was not clear to the user."
            />
          )}

          {kyc?.reject_reason_code && (
            <HawkCallout
              semantic={HawkSemantic.CRITICAL}
              title={`Rejected — ${kyc?.reject_reason_code.replace(/_/g, ' ')}`}
              message={kyc?.reject_note ?? 'No note was recorded.'}
            />
          )}

          {/*
            The documents themselves.
            
            This is the whole point of a KYC review: an operator decides by
            LOOKING at the identity document beside the selfie, not by reading
            a status field. The previous screen had these and the redesign
            dropped them — restored, and given the room they need.
          */}
          {(kyc?.document_upload_id || kyc?.selfie_upload_key) && (
            <div className="grid gap-hawk-5 sm:grid-cols-2">
              <div className="flex flex-col gap-hawk-3">
                <HawkCaption ink="muted">Identity document</HawkCaption>
                <FilePreview
                  fileKey={kyc?.document_upload_id}
                  label="Identity document"
                  height={260}
                />
              </div>
              <div className="flex flex-col gap-hawk-3">
                <HawkCaption ink="muted">Selfie</HawkCaption>
                <FilePreview
                  fileKey={kyc?.selfie_upload_key}
                  label="Selfie"
                  height={260}
                />
              </div>
            </div>
          )}

          {kycExtra.reject_item_keys.length > 0 && (
            <div className="flex flex-col gap-hawk-2">
              <HawkCaption ink="muted">Items to resubmit</HawkCaption>
              <div className="flex flex-wrap gap-hawk-2">
                {kycExtra.reject_item_keys.map((key) => (
                  <HawkBadge key={key} label={key.replace(/_/g, ' ')} semantic={HawkSemantic.CAUTION} size="sm" />
                ))}
              </div>
            </div>
          )}
        </div>
      </HawkAdminPanel>

      <HawkAdminPanel
        title="Strikes"
        flush
        actions={
          user.strikes.length > 0 ? (
            <HawkCaption ink="muted" className="hawk-record">
              {user.strikes.filter((s) => s.status === 'active').length} active
            </HawkCaption>
          ) : undefined
        }
      >
        <HawkTable
          bare
          columns={strikeColumns}
          rows={user.strikes}
          rowKey={(row) => row.id}
          emptyTitle="No strikes"
          emptyDescription="This account has a clean record."
        />
      </HawkAdminPanel>

      <HawkAdminPanel title="Reports" flush>
        <HawkTable
          bare
          columns={reportColumns}
          rows={user.reports}
          rowKey={(row) => row.id}
          emptyTitle="No reports"
          emptyDescription="Nobody has reported this user, and they have reported nobody."
        />
      </HawkAdminPanel>

      <HawkAdminPanel
        title="Operator actions on this account"
        flush
        actions={<HawkCaption ink="muted">admin_audit_log</HawkCaption>}
      >
        <HawkTable
          bare
          columns={actionColumns}
          rows={user.admin_actions}
          rowKey={(row) => row.id}
          emptyTitle="No operator actions"
          emptyDescription="No admin has ever acted on this account."
        />
      </HawkAdminPanel>

      <HawkText variant="caption" ink="disabled" className="leading-snug">
        Every action an operator takes here is written to the audit log with their identity and
        the reason they gave — including impersonation.
      </HawkText>
    </div>
  );
}
