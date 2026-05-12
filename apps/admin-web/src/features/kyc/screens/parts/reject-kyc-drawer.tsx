import { useEffect, useMemo, useState } from 'react';

import {
  AppButton,
  AppDropdownInput,
  AppText,
  AppTextAreaInput,
  cn,
} from '@ohlify/ui';

import { DetailDrawer } from '../../../../shared/parts/detail-drawer.js';

import type { RejectKycPayload } from '../../api/use-kyc.js';

/**
 * Each reason code maps to a short, user-friendly label. Mirrors the
 * customer-side `REASON_LABELS` map used on the rejection screen as a
 * fallback when the admin-supplied note is empty.
 */
const REASON_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Document unclear', value: 'document_unclear' },
  { label: 'Identity mismatch', value: 'identity_mismatch' },
  { label: 'Expired document', value: 'expired_document' },
  { label: 'Verification failed integrity checks', value: 'fraudulent' },
  { label: 'Other / additional info needed', value: 'other' },
];

/**
 * Item-key catalog. Admin sees the union for both roles — `bank_account`
 * and `rates` only apply to professionals, but the server normalizes the
 * received list against `KNOWN_KYC_ITEM_KEYS` and the user-side spec is
 * already role-correct, so we don't gate the UI here.
 */
interface ItemDef {
  key: string;
  label: string;
  hint: string;
}

const ITEM_DEFS: ReadonlyArray<ItemDef> = [
  { key: 'identity', label: 'Identity document', hint: 'ID type, number + photo of the doc' },
  { key: 'selfie', label: 'Selfie', hint: 'Photo of the user holding their ID' },
  { key: 'bank_account', label: 'Bank account', hint: 'Pro only — payout account details' },
  { key: 'full_name', label: 'Full name', hint: 'As it appears on government ID' },
  { key: 'handle', label: 'Public handle', hint: 'Pro only — booking-link slug' },
  { key: 'occupation', label: 'Occupation', hint: 'Pro only — short title' },
  { key: 'description', label: 'Description', hint: 'Bio / about copy' },
  { key: 'interests', label: 'Interests', hint: 'Tag list' },
  { key: 'rates', label: 'Rates', hint: 'Pro only — call pricing' },
];

interface RejectKycDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Submitting state from the parent's mutation. */
  isSubmitting: boolean;
  /** Fires with the validated payload; parent owns the mutation. */
  onSubmit: (payload: RejectKycPayload) => void;
}

/**
 * Drawer for issuing a rejection. The admin picks a reason code, optionally
 * scopes the rejection to specific KYC items, and writes a user-facing note.
 *
 * Behavior:
 *   - No items checked = whole-submission rejection (legacy). User redoes
 *     everything.
 *   - One+ items checked = partial rejection. User's KYC screen will lock
 *     every other item; only the checked ones remain editable.
 */
export function RejectKycDrawer({
  open,
  onClose,
  isSubmitting,
  onSubmit,
}: RejectKycDrawerProps) {
  const [reasonCode, setReasonCode] = useState<string>('other');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string>('');
  const [showErrors, setShowErrors] = useState(false);

  // Reset whenever the drawer is opened so admins don't see leftover state
  // from a previous reject they cancelled.
  useEffect(() => {
    if (!open) return;
    setReasonCode('other');
    setSelectedItems(new Set());
    setNote('');
    setShowErrors(false);
  }, [open]);

  const noteError = useMemo(() => {
    if (!showErrors) return undefined;
    if (note.trim().length === 0) return 'Required — the user sees this exact text.';
    if (note.trim().length > 2000) return 'Keep under 2000 characters.';
    return undefined;
  }, [note, showErrors]);

  const toggleItem = (key: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const submit = () => {
    setShowErrors(true);
    if (note.trim().length === 0 || note.trim().length > 2000) return;
    const payload: RejectKycPayload = {
      reason_code: reasonCode,
      note: note.trim(),
    };
    if (selectedItems.size > 0) {
      payload.item_keys = [...selectedItems];
    }
    onSubmit(payload);
  };

  const partial = selectedItems.size > 0;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="Reject KYC"
      subtitle="The user will be routed to the rejection screen with this exact note."
      width={520}
      footer={
        <>
          <AppButton
            label="Cancel"
            variant="plain"
            height={40}
            onPressed={onClose}
            isDisabled={isSubmitting}
          />
          <AppButton
            label={partial ? 'Send for partial resubmit' : 'Reject everything'}
            variant="solid"
            height={40}
            isLoading={isSubmitting}
            onPressed={submit}
          />
        </>
      }
    >
      <div className="flex flex-col gap-5 px-5 py-5">
        <div className="flex flex-col gap-1.5">
          <AppText
            variant="bodySmall"
            className="text-[11px] font-bold uppercase tracking-wider text-text-muted"
          >
            Reason code
          </AppText>
          <AppDropdownInput<string>
            options={REASON_OPTIONS}
            value={reasonCode}
            onChange={setReasonCode}
            placeholder="Pick a reason"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <AppText
              variant="bodySmall"
              className="text-[11px] font-bold uppercase tracking-wider text-text-muted"
            >
              Items to resubmit
            </AppText>
            <AppText variant="bodySmall" className="text-text-muted">
              {partial ? `${selectedItems.size} flagged` : 'None — full resubmit'}
            </AppText>
          </div>
          <AppText variant="bodySmall" className="text-text-muted">
            Leave all unchecked to make the user redo every item. Pick specific items to scope
            the resubmit.
          </AppText>
          <div className="mt-1 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {ITEM_DEFS.map((it) => {
              const checked = selectedItems.has(it.key);
              return (
                <label
                  key={it.key}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors',
                    checked ? 'bg-amber-50' : 'bg-surface hover:bg-surface-light',
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 cursor-pointer accent-amber-500"
                    checked={checked}
                    onChange={() => toggleItem(it.key)}
                  />
                  <div className="min-w-0 flex-1 flex flex-col">
                    <AppText variant="body" weight={600} align="start">
                      {it.label}
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      align="start"
                      className="mt-0.5 text-text-muted"
                    >
                      {it.hint}
                    </AppText>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <AppText
            variant="bodySmall"
            className="text-[11px] font-bold uppercase tracking-wider text-text-muted"
          >
            Note to the user
          </AppText>
          <AppTextAreaInput
            value={note}
            onChange={setNote}
            placeholder="Be specific. The user will read this verbatim on their rejection screen."
            maxLength={2000}
            minLines={4}
            maxLines={8}
            errorMessage={noteError}
          />
        </div>
      </div>
    </DetailDrawer>
  );
}
