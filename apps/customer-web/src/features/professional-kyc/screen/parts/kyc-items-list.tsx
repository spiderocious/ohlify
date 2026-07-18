import {
  IconBriefcase,
  IconBuilding,
  IconCamera,
  IconFileText,
  IconHeart,
  IconIdCard,
  IconTag,
  IconUser,
  type LucideIcon,
} from '@icons';
import { DrawerService, InterestsForm, KycItemTile, OccupationForm } from '@ohlify/ui';
import type {
  KycBankValue,
  KycIdentityValue,
  KycItemKey,
  KycItemSpec,
  KycRateValue,
  KycSelfieValue,
  KycValidationRule,
} from '@ohlify/api';

import { useSaveProfessionalKyc } from '../../api/use-save-professional-kyc.js';
import { BankModalContent } from './bank-modal-content.js';
import { HandleModalContent } from './handle-modal-content.js';
import { IdentityModalContent } from './identity-modal-content.js';
import { RatesModalContent } from './rates-modal-content.js';
import { SelfieModalContent } from './selfie-modal-content.js';

const ICONS: Record<KycItemKey, LucideIcon> = {
  full_name: IconUser,
  handle: IconUser,
  occupation: IconBriefcase,
  description: IconFileText,
  interests: IconHeart,
  bank_account: IconBuilding,
  identity: IconIdCard,
  selfie: IconCamera,
  rates: IconTag,
};

const successToast = (m: string) => DrawerService.toast(m, { type: 'success' });
// KYC save modals previously wired only onSuccess, so a rejected PATCH (e.g.
// full_name below min_length, or selfie-before-identity) closed silently and
// the user believed the value saved. Every save now surfaces its failure.
// (BUG-kyc-professional-cw-02 / cw-03.)
const errorToast = (err: unknown, fallback: string) =>
  DrawerService.toast(err instanceof Error && err.message ? err.message : fallback, {
    type: 'error',
  });

// ── Helpers — read inline-validation hints from the spec ─────────────────────

const ruleNumber = (
  rules: KycValidationRule[],
  name: 'min_length' | 'max_length' | 'min_items' | 'max_items',
): number | undefined => {
  for (const r of rules) if (r.rule === name) return r.value;
  return undefined;
};

// ── Per-item summary text ────────────────────────────────────────────────────

function summaryFor(item: KycItemSpec): string {
  if (!item.complete || item.value === null) return item.subtitle;
  switch (item.kind) {
    case 'text':
    case 'textarea':
    case 'handle':
      return String(item.value);
    case 'tags':
      return Array.isArray(item.value) ? (item.value as string[]).join(', ') : item.subtitle;
    case 'bank': {
      const v = item.value as KycBankValue;
      return `${v.bank_name} • ${v.account_number_masked}`;
    }
    case 'identity': {
      const v = item.value as KycIdentityValue;
      const tail = v.document_upload_key ? '— photo on file' : '— photo missing';
      return `${v.method.toUpperCase()} ${v.id_number_masked} ${tail}`;
    }
    case 'selfie': {
      const v = item.value as KycSelfieValue;
      return v.upload_key ? 'Selfie uploaded' : item.subtitle;
    }
    case 'rates': {
      const v = item.value as KycRateValue[];
      return `${v.length} rate(s) added`;
    }
    case 'image_upload':
      return 'File uploaded';
  }
}

interface KycItemsListProps {
  items: KycItemSpec[];
  /**
   * When set, only items whose key is in this set are editable. All other
   * tiles render as locked (dimmed, no tap). Used during partial KYC
   * resubmits — the spec endpoint surfaces this via `resubmission`.
   *
   * Pass `null` (the default) to leave every tile editable.
   */
  resubmitKeys?: readonly KycItemKey[] | null;
}

export function KycItemsList({ items, resubmitKeys = null }: KycItemsListProps) {
  const saveKyc = useSaveProfessionalKyc();
  const flaggedSet = resubmitKeys && resubmitKeys.length > 0 ? new Set<string>(resubmitKeys) : null;

  // In a partial-rejection state, surface the items the user needs to act
  // on first. Locked tiles still render so the user can see the rest of
  // their submission isn't being asked for, but they sink to the bottom.
  const orderedItems =
    flaggedSet === null
      ? items
      : [
          ...items.filter((i) => flaggedSet.has(i.key)),
          ...items.filter((i) => !flaggedSet.has(i.key)),
        ];

  const open = (item: KycItemSpec) => {
    switch (item.kind) {
      case 'text':
        return openTextModal(item, false, saveKyc);
      case 'handle':
        return openHandleModal(item, saveKyc);
      case 'textarea':
        return openTextModal(item, true, saveKyc);
      case 'tags':
        return openInterestsModal(item, saveKyc);
      case 'bank':
        return openBankModal(item);
      case 'identity':
        return openIdentityModal(item, saveKyc);
      case 'selfie':
        return openSelfieModal(item, saveKyc);
      case 'rates':
        return openRatesModal(item);
      case 'image_upload':
        // Reserved for future kinds; nothing to do today.
        return;
    }
  };

  return (
    <div className="space-y-3">
      {orderedItems.map((item) => {
        const flagged = flaggedSet !== null && flaggedSet.has(item.key);
        const locked = flaggedSet !== null && !flagged;
        // Flagged items must NOT render as complete even if their last
        // value was on file — the admin asked the user to act on them.
        const completed = flagged ? false : item.complete;
        return (
          <KycItemTile
            key={item.key}
            Icon={ICONS[item.key] ?? IconFileText}
            title={item.label}
            subtitle={flagged ? item.subtitle : summaryFor(item)}
            completed={completed}
            locked={locked}
            onTap={() => open(item)}
          />
        );
      })}
    </div>
  );
}

// ── Per-kind modal openers ───────────────────────────────────────────────────

function openTextModal(
  item: KycItemSpec,
  multiline: boolean,
  saveKyc: ReturnType<typeof useSaveProfessionalKyc>,
) {
  const minLen = ruleNumber(item.validation, 'min_length');
  const maxLen = ruleNumber(item.validation, 'max_length');
  let pending: string | undefined;
  const handle = DrawerService.showInputModal(item.label, item.subtitle, {
    placeholder: item.label,
    defaultValue: typeof item.value === 'string' ? item.value : '',
    multiline,
    ...(maxLen !== undefined ? { maxLength: maxLen } : {}),
    confirmButtonText: 'Save',
    showCancelButton: false,
    onConfirm: (v) => {
      const trimmed = v.trim();
      if (minLen !== undefined && trimmed.length < minLen) return;
      pending = trimmed;
    },
  });
  void handle.onDismissed.then(() => {
    if (pending === undefined) return;
    saveKyc.mutate({ [item.key]: pending } as Record<string, string>, {
      onSuccess: () => successToast(`${item.label} saved`),
      onError: (err) => errorToast(err, `Could not save ${item.label.toLowerCase()}.`),
    });
  });
}

function openHandleModal(item: KycItemSpec, saveKyc: ReturnType<typeof useSaveProfessionalKyc>) {
  const initial = typeof item.value === 'string' ? item.value : null;
  DrawerService.showCustomModal(
    item.label,
    (dismiss) => (
      <HandleModalContent
        initial={initial}
        subtitle={item.subtitle}
        onSubmit={async (handle) => {
          await saveKyc.mutateAsync({ handle });
        }}
        onSuccess={() => {
          successToast(`${item.label} saved`);
          dismiss();
        }}
      />
    ),
    { position: 'center' },
  );
}

function openInterestsModal(item: KycItemSpec, saveKyc: ReturnType<typeof useSaveProfessionalKyc>) {
  let pending: string[] | undefined;
  let close: (() => void) | null = null;
  const handle = DrawerService.showCustomModal(
    item.label,
    (dismiss) => {
      close = dismiss;
      const initial = Array.isArray(item.value) ? (item.value as string[]) : [];
      return (
        <InterestsForm
          initialInterests={initial}
          onSave={(values) => {
            pending = values;
            close?.();
          }}
        />
      );
    },
    { position: 'center' },
  );
  void handle.onDismissed.then(() => {
    if (!pending) return;
    saveKyc.mutate(
      { interests: pending },
      {
        onSuccess: () => successToast(`${item.label} saved`),
        onError: (err) => errorToast(err, `Could not save ${item.label.toLowerCase()}.`),
      },
    );
  });
}

function openBankModal(item: KycItemSpec) {
  DrawerService.showCustomModal(
    item.label,
    (dismiss) => (
      <BankModalContent
        initial={(item.value as KycBankValue | null) ?? null}
        onSuccess={() => {
          successToast('Bank account saved');
          dismiss();
        }}
      />
    ),
    { position: 'center' },
  );
}

function openIdentityModal(item: KycItemSpec, saveKyc: ReturnType<typeof useSaveProfessionalKyc>) {
  DrawerService.showCustomModal(
    item.label,
    (dismiss) => (
      <IdentityModalContent
        initial={(item.value as KycIdentityValue | null) ?? null}
        validation={item.validation}
        onSubmit={async (s) => {
          await saveKyc.mutateAsync({
            identity: {
              type: s.type,
              number: s.number,
              document_upload_key: s.document_upload_key,
            },
          });
        }}
        onSuccess={() => {
          successToast('Identity saved');
          dismiss();
        }}
      />
    ),
    { position: 'center' },
  );
}

function openSelfieModal(item: KycItemSpec, saveKyc: ReturnType<typeof useSaveProfessionalKyc>) {
  const initialKey = (item.value as KycSelfieValue | null)?.upload_key ?? null;
  DrawerService.showCustomModal(
    item.label,
    (dismiss) => (
      <SelfieModalContent
        initialKey={initialKey}
        onSubmit={async (key) => {
          await saveKyc.mutateAsync({ selfie: { upload_key: key } });
        }}
        onSuccess={() => {
          successToast('Selfie saved');
          dismiss();
        }}
      />
    ),
    { position: 'center' },
  );
}

function openRatesModal(item: KycItemSpec) {
  DrawerService.showCustomModal(item.label, (dismiss) => <RatesModalContent onDone={dismiss} />, {
    position: 'center',
  });
}

// Suppress unused-warning during build — referenced for completeness.
void OccupationForm;
