import { useState } from 'react';

import { AppButton, AppDropdownInput, AppText, AppTextInput } from '@ohlify/ui';
import {
  StrikeReasonCode,
  StrikeStatus,
  StrikeSubjectRole,
  type AdminStrikeView,
} from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useStrikes } from '../api/use-strikes.js';
import { IssueStrikeDialog } from '../parts/issue-strike-dialog.js';
import { StrikeDetailDrawer } from '../parts/strike-detail-drawer.js';
import { StrikeStatusPill } from '../parts/strike-status-pill.js';

const STATUS_OPTIONS = [
  { label: 'Any', value: '' },
  ...Object.values(StrikeStatus).map((v) => ({ label: humanizeStatus(v), value: v })),
];
const ROLE_OPTIONS = [
  { label: 'Any role', value: '' },
  ...Object.values(StrikeSubjectRole).map((v) => ({ label: humanizeStatus(v), value: v })),
];
const REASON_OPTIONS = [
  { label: 'Any reason', value: '' },
  ...Object.values(StrikeReasonCode).map((v) => ({ label: humanizeStatus(v), value: v })),
];

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

  const columns: ColumnDef<AdminStrikeView>[] = [
    {
      key: 'subject',
      header: 'Subject',
      width: '24%',
      render: (s) => (
        <div className="flex flex-col">
          <AppText variant="body" className="font-semibold text-text-primary">
            {s.subject?.name ?? '—'}
          </AppText>
          <UserLink userId={s.subject?.id} idLen={18} />
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '12%',
      render: (s) => (s.subject?.role ? humanizeStatus(s.subject.role) : '—'),
    },
    {
      key: 'reason',
      header: 'Reason',
      width: '20%',
      render: (s) => humanizeStatus(s.reason_code ?? ''),
    },
    {
      key: 'desc',
      header: 'Description',
      width: '22%',
      render: (s) => <span className="line-clamp-1">{s.description ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (s) => <StrikeStatusPill status={s.status} />,
    },
    {
      key: 'when',
      header: 'When',
      width: '10%',
      render: (s) => <span className="text-text-muted">{formatRelative(s.created_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Strikes"
        subtitle="Moderate disputed strikes, void mistaken ones, or issue manually."
        actions={
          <AppButton
            label="Issue strike"
            variant="solid"
            height={36}
            onPressed={() => setShowIssue(true)}
          />
        }
      />

      <FilterBar>
        <div className="w-44">
          <AppDropdownInput
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
          />
        </div>
        <div className="w-44">
          <AppDropdownInput
            label="Role"
            options={ROLE_OPTIONS}
            value={subjectRole}
            onChange={setSubjectRole}
          />
        </div>
        <div className="w-56">
          <AppDropdownInput
            label="Reason"
            options={REASON_OPTIONS}
            value={reasonCode}
            onChange={setReasonCode}
          />
        </div>
        <div className="w-72">
          <AppTextInput
            label="Subject user ID"
            placeholder="user uuid"
            value={subjectUserId}
            onChange={setSubjectUserId}
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(s) => s.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No strikes"
        onRowClick={(s) => setOpenId(s.id)}
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

      <StrikeDetailDrawer strikeId={openId} onClose={() => setOpenId(null)} />

      <IssueStrikeDialog
        open={showIssue}
        onClose={() => setShowIssue(false)}
        onIssued={(s) => {
          list.refetch();
          setOpenId(s.id);
        }}
      />
    </>
  );
}
