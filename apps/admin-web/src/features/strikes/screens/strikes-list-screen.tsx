import { useState } from 'react';

import { StrikeReasonCode, StrikeStatus, type AdminStrikeView } from '@ohlify/api';
import {
  HawkButton,
  HawkCaption,
  HawkDropdown,
  HawkSearchInput,
  HawkStatusBadge,
  HawkText,
  IconShield,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { statusFor, statusTabs } from '../../../shared/parts/board-status.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus } from '../../../shared/lib/labels.js';
import { useStrikes } from '../api/use-strikes.js';
import { IssueStrikeDialog } from '../parts/issue-strike-dialog.js';
import { StrikeDetailDrawer } from '../parts/strike-detail-drawer.js';

const ROLE_OPTIONS = [
  { value: '', label: 'Any role' },
  { value: 'client', label: 'Client' },
  { value: 'professional', label: 'Professional' },
];

const REASON_OPTIONS = [
  { value: '', label: 'Any reason' },
  ...Object.values(StrikeReasonCode).map((v) => ({ value: v, label: humanizeStatus(v) })),
];

/**
 * The strike board (A18).
 *
 * Strikes accumulate against standing, so the queue is read for two things:
 * **disputed** ones, which need a human decision, and repeat subjects, which
 * are the pattern worth acting on. Disputes therefore lead the tabs and get
 * their own metric — an unanswered dispute is somebody locked out of earning
 * while they wait.
 */
export function StrikesListScreen() {
  const [status, setStatus] = useState('');
  const [subjectRole, setSubjectRole] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [subjectUserId, setSubjectUserId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showIssue, setShowIssue] = useState(false);

  const list = useStrikes({
    status,
    subject_role: subjectRole,
    reason_code: reasonCode,
    subject_user_id: subjectUserId,
  });

  const active = list.items.filter((row) => row.status === StrikeStatus.ACTIVE).length;
  const disputed = list.items.filter((row) => row.status === StrikeStatus.DISPUTED).length;

  const kpis: HawkKpi[] = [
    {
      key: 'disputed',
      label: 'Awaiting a ruling',
      value: disputed.toLocaleString(),
      icon: IconShield,
      semantic: disputed > 0 ? 'caution' : 'neutral',
    },
    {
      key: 'active',
      label: 'Active on this page',
      value: active.toLocaleString(),
      icon: IconShield,
      semantic: active > 0 ? 'critical' : 'neutral',
    },
    {
      key: 'shown',
      label: 'Rows shown',
      value: list.items.length.toLocaleString(),
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminStrikeView>> = [
    {
      key: 'subject',
      header: 'Subject',
      width: '24%',
      render: (row) => (
        <div className="flex flex-col">
          <HawkText variant="label" ink="strong" clamp={1} className="font-medium">
            {row.subject?.name ?? '—'}
          </HawkText>
          <UserLink userId={row.subject?.id} idLen={16} />
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '11%',
      render: (row) => (
        <HawkCaption>{row.subject?.role ? humanizeStatus(row.subject.role) : '—'}</HawkCaption>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      width: '18%',
      render: (row) => (
        <HawkText variant="label">{humanizeStatus(row.reason_code ?? '')}</HawkText>
      ),
    },
    {
      key: 'desc',
      header: 'Detail',
      render: (row) => (
        <HawkCaption ink="muted" clamp={1}>
          {row.description ?? '—'}
        </HawkCaption>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '13%',
      render: (row) => <HawkStatusBadge status={statusFor('strike', row.status)} size="sm" />,
    },
    {
      key: 'when',
      header: 'Issued',
      align: 'right',
      width: '12%',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{formatRelative(row.created_at)}</span>
      ),
    },
  ];

  return (
    <>
      <BoardScreen
        title="Strikes"
        subtitle={
          disputed > 0
            ? `${disputed} disputed and awaiting a ruling`
            : 'Moderate disputed strikes, void mistaken ones, or issue manually.'
        }
        actions={
          <HawkButton
            label="Issue strike"
            startIcon={IconShield}
            onClick={() => setShowIssue(true)}
          />
        }
        kpis={kpis}
        tabs={statusTabs('strike')}
        activeTab={status}
        onTabChange={setStatus}
        filters={
          <>
            <HawkDropdown
              options={ROLE_OPTIONS}
              value={subjectRole}
              onChange={setSubjectRole}
              placeholder="Any role"
            />
            <HawkDropdown
              options={REASON_OPTIONS}
              value={reasonCode}
              onChange={setReasonCode}
              placeholder="Any reason"
            />
            <div className="w-56">
              <HawkSearchInput
                value={subjectUserId}
                onChange={setSubjectUserId}
                placeholder="Filter by subject user ID"
              />
            </div>
          </>
        }
        columns={columns}
        list={list}
        rowKey={(row) => row.id}
        onRowClick={(row) => setOpenId(row.id)}
        emptyTitle="No strikes"
        emptyDescription="Nothing matches these filters."
      />

      <StrikeDetailDrawer strikeId={openId} onClose={() => setOpenId(null)} />

      <IssueStrikeDialog
        open={showIssue}
        onClose={() => setShowIssue(false)}
        onIssued={(strike) => {
          setShowIssue(false);
          setOpenId(strike.id);
          list.refetch();
        }}
      />
    </>
  );
}
