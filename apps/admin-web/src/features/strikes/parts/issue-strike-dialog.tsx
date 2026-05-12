import { useMemo, useState } from 'react';

import { AppButton, AppDropdownInput, AppText, AppTextAreaInput, AppTextInput } from '@ohlify/ui';
import {
  StrikeReasonCode,
  StrikeSubjectRole,
  type AdminStrikeView,
} from '@ohlify/api';

import { confirm, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { humanizeStatus } from '../../../shared/lib/labels.js';
import { useIssueStrike } from '../api/use-strikes.js';

const PRO_REASONS: StrikeReasonCode[] = [
  StrikeReasonCode.NO_SHOW,
  StrikeReasonCode.LATE_CANCEL,
  StrikeReasonCode.MID_CALL_QUIT,
];
const CALLER_REASONS: StrikeReasonCode[] = [
  StrikeReasonCode.CALLER_NO_SHOW,
  StrikeReasonCode.CALLER_DISCONNECT,
];

const ROLE_OPTIONS = Object.values(StrikeSubjectRole).map((v) => ({
  label: humanizeStatus(v),
  value: v,
}));

interface IssueStrikeDialogProps {
  open: boolean;
  onClose: () => void;
  onIssued: (strike: AdminStrikeView) => void;
}

/**
 * Manual strike issuance form. Backend enforces reason↔role pairing
 * (see strikes.service.ts → reasonMatchesRole), so the dropdown adapts
 * to the chosen role to prevent client-side mismatches before submission.
 */
export function IssueStrikeDialog({ open, onClose, onIssued }: IssueStrikeDialogProps) {
  const issue = useIssueStrike();

  const [subjectUserId, setSubjectUserId] = useState('');
  const [role, setRole] = useState<StrikeSubjectRole>(StrikeSubjectRole.PROFESSIONAL);
  const [reason, setReason] = useState<StrikeReasonCode>(StrikeReasonCode.NO_SHOW);
  const [description, setDescription] = useState('');
  const [callId, setCallId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [reportId, setReportId] = useState('');

  const reasonOptions = useMemo(() => {
    const allowed = role === StrikeSubjectRole.PROFESSIONAL ? PRO_REASONS : CALLER_REASONS;
    return allowed.map((v) => ({ label: humanizeStatus(v), value: v }));
  }, [role]);

  // Keep reason in sync with role.
  const onRoleChange = (next: string) => {
    const nextRole = next as StrikeSubjectRole;
    setRole(nextRole);
    const fallback =
      nextRole === StrikeSubjectRole.PROFESSIONAL
        ? StrikeReasonCode.NO_SHOW
        : StrikeReasonCode.CALLER_NO_SHOW;
    setReason(fallback);
  };

  const valid =
    subjectUserId.trim().length > 0 && description.trim().length > 0 && reason && role;

  const onSubmit = async () => {
    if (!valid) return;
    if (
      !(await confirm({
        title: 'Issue strike?',
        message: `This counts toward the user\'s ban threshold. Audit trail will record you as the issuer.`,
        destructive: true,
      }))
    )
      return;
    issue.mutate(
      {
        subject_user_id: subjectUserId,
        subject_role: role,
        reason_code: reason,
        description,
        ...(callId ? { related_call_id: callId } : {}),
        ...(bookingId ? { related_booking_id: bookingId } : {}),
        ...(reportId ? { related_report_id: reportId } : {}),
      },
      {
        onSuccess: (created) => {
          toastSuccess('Strike issued');
          onIssued(created);
          onClose();
        },
        onError: (err) => toastError(err),
      },
    );
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-surface p-6 shadow-xl">
        <AppText variant="bodyTitle" className="text-text-primary">
          Issue strike
        </AppText>
        <AppText variant="bodySmall" className="mt-1 text-text-muted">
          For off-platform misconduct. System-issued strikes (no-show, etc.) come from the call resolver.
        </AppText>

        <div className="mt-4 flex flex-col gap-3">
          <AppTextInput
            label="Subject user ID"
            placeholder="user uuid"
            value={subjectUserId}
            onChange={setSubjectUserId}
          />
          <div className="grid grid-cols-2 gap-3">
            <AppDropdownInput
              label="Subject role"
              options={ROLE_OPTIONS}
              value={role}
              onChange={onRoleChange}
            />
            <AppDropdownInput
              label="Reason"
              options={reasonOptions}
              value={reason}
              onChange={(v) => setReason(v as StrikeReasonCode)}
            />
          </div>
          <AppTextAreaInput
            label="Description (required)"
            value={description}
            onChange={setDescription}
            placeholder="e.g. Repeated abusive language in support tickets — see ticket #1234"
          />
          <AppTextInput
            label="Related call ID (optional)"
            value={callId}
            onChange={setCallId}
          />
          <AppTextInput
            label="Related booking ID (optional)"
            value={bookingId}
            onChange={setBookingId}
          />
          <AppTextInput
            label="Related report ID (optional)"
            value={reportId}
            onChange={setReportId}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <AppButton label="Cancel" variant="outline" height={36} onPressed={onClose} />
          <AppButton
            label="Issue strike"
            variant="solid"
            height={36}
            isLoading={issue.isPending}
            onPressed={valid ? onSubmit : undefined}
          />
        </div>
      </div>
    </div>
  );
}
