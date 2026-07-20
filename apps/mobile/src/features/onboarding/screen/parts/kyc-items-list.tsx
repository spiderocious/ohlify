import {
  InterestsForm,
  KycItemTile,
  OccupationForm,
  showCustomModal,
  showInputModal,
  showToast,
  type AppIconName,
} from '@ohlify/mobile-ui';
import type { Role } from '@ohlify/core';
import { View } from 'react-native';

import { onboardingApi } from '@features/onboarding/api/onboarding-api';
import { useKycSpec } from '@features/onboarding/providers/kyc-spec-provider';
import {
  identityTypeToWire,
  kycBankValue,
  kycIdentityValue,
  kycItemKeyToWire,
  kycRatesValue,
  kycSelfieValue,
  kycTagsValue,
  kycTextValue,
  type KycItemKey,
  type KycItemSpec,
} from '@features/onboarding/types/kyc-spec';
import { findRule } from '@features/onboarding/types/kyc-validation';
import { ApiError } from '@shared/types/api-error';

import { BankModalContent } from './bank-modal-content';
import { HandleModalContent } from './handle-modal-content';
import { IdentityModalContent, type IdentitySubmission } from './identity-modal-content';
import { RatesModalContent } from './rates-modal-content';
import { SelfieModalContent } from './selfie-modal-content';

/**
 * Spec-driven KYC item list. Each item renders a KycItemTile and opens the
 * matching modal on tap. Mirrors
 * mobile/lib/features/onboarding/screen/parts/kyc_items_list.dart.
 */
const ICON_FOR_KEY: Record<KycItemKey, AppIconName> = {
  fullName: 'person',
  handle: 'atSign',
  occupation: 'work',
  description: 'article',
  interests: 'interests',
  bankAccount: 'building',
  identity: 'badge',
  selfie: 'cameraAlt',
  rates: 'payments',
  unknown: 'info',
};

export interface KycItemsListProps {
  role: Role;
  items: KycItemSpec[];
  resubmitKeys?: string[];
}

export function KycItemsList({ role, items, resubmitKeys }: KycItemsListProps) {
  const { refetch, itemFor } = useKycSpec();

  const flaggedSet = resubmitKeys && resubmitKeys.length > 0 ? new Set(resubmitKeys) : null;

  // In a partial-rejection state, surface the items the user needs to act
  // on first — locked tiles still render but sink to the bottom.
  const ordered = flaggedSet
    ? [...items.filter((i) => flaggedSet.has(kycItemKeyToWire(i.key))), ...items.filter((i) => !flaggedSet.has(kycItemKeyToWire(i.key)))]
    : items;

  function summaryFor(item: KycItemSpec): string {
    if (!item.complete || item.value === null || item.value === undefined) return item.subtitle;
    switch (item.kind) {
      case 'text':
      case 'textarea':
      case 'handle':
        return kycTextValue(item) ?? item.subtitle;
      case 'tags': {
        const tags = kycTagsValue(item) ?? [];
        return tags.length === 0 ? item.subtitle : tags.join(', ');
      }
      case 'bank': {
        const v = kycBankValue(item);
        return v ? `${v.bankName} • ${v.accountNumberMasked}` : item.subtitle;
      }
      case 'identity': {
        const v = kycIdentityValue(item);
        if (!v) return item.subtitle;
        const tail = v.documentUploadKey ? '— photo on file' : '— photo missing';
        return `${v.method} ${v.idNumberMasked} ${tail}`;
      }
      case 'selfie':
        return 'Selfie uploaded';
      case 'rates': {
        const n = kycRatesValue(item)?.length ?? 0;
        return `${n} rate${n === 1 ? '' : 's'} added`;
      }
      case 'imageUpload':
        return 'File uploaded';
      default:
        return item.subtitle;
    }
  }

  function open(item: KycItemSpec) {
    switch (item.kind) {
      case 'text':
        return openTextModal(item, false);
      case 'handle':
        return openHandleModal(item);
      case 'textarea':
        return openTextModal(item, true);
      case 'tags':
        return openTagsModal(item);
      case 'bank':
        return openBankModal(item);
      case 'identity':
        return openIdentityModal(item);
      case 'selfie':
        return openSelfieModal(item);
      case 'rates':
        return openRatesModal(item);
      default:
        return;
    }
  }

  function openTextModal(item: KycItemSpec, multiline: boolean) {
    // Occupation gets its own curated picker — match the existing UX.
    if (item.key === 'occupation') {
      openOccupationModal(item);
      return;
    }
    const maxLenRule = findRule(item.validation, 'max_length');
    const minLenRule = findRule(item.validation, 'min_length');
    let pendingValue: string | undefined;
    const handle = showInputModal(item.label, item.subtitle, {
      placeholder: item.label,
      defaultValue: kycTextValue(item),
      multiline,
      maxLength: maxLenRule?.value,
      confirmButtonText: 'Save',
      showCancelButton: false,
      onConfirm: (v) => {
        const trimmed = v.trim();
        if (minLenRule && trimmed.length < minLenRule.value) return;
        pendingValue = trimmed;
      },
    });
    handle.onDismissed.then(() => {
      if (pendingValue === undefined) return;
      void saveTextField(item, pendingValue);
    });
  }

  function openHandleModal(item: KycItemSpec) {
    const handle = showCustomModal(
      item.label,
      (dismiss) => (
        <HandleModalContent
          item={item}
          onSubmit={async (value) => {
            await onboardingApi.saveProfessionalKyc({ [kycItemKeyToWire(item.key)]: value });
            await refetch();
            dismiss();
          }}
        />
      ),
      { position: 'center' },
    );
    handle.onDismissed.then(async () => {
      // Diff completion to know whether to celebrate — modal closes itself
      // on a successful save, so a non-cancelled close means saved.
      await refetch();
      const fresh = itemFor('handle');
      if (fresh?.complete === true && item.complete === false) {
        showToast('Username saved', { type: 'success' });
      }
    });
  }

  function openOccupationModal(item: KycItemSpec) {
    let pendingValue: string | undefined;
    const handle = showCustomModal(
      item.label,
      (dismiss) => (
        <OccupationForm
          initialValue={kycTextValue(item)}
          onSave={(value) => {
            pendingValue = value;
            dismiss();
          }}
        />
      ),
      { position: 'center' },
    );
    handle.onDismissed.then(() => {
      if (pendingValue === undefined) return;
      void saveTextField(item, pendingValue);
    });
  }

  function openTagsModal(item: KycItemSpec) {
    let pendingValues: string[] | undefined;
    const handle = showCustomModal(
      item.label,
      (dismiss) => (
        <InterestsForm
          initialInterests={kycTagsValue(item) ?? []}
          isFullscreen
          onSave={(values) => {
            pendingValues = values;
            dismiss();
          }}
        />
      ),
      { position: 'fullscreen' },
    );
    handle.onDismissed.then(() => {
      if (pendingValues === undefined) return;
      void saveTagsField(item, pendingValues);
    });
  }

  function openBankModal(item: KycItemSpec) {
    const handle = showCustomModal(
      item.label,
      (dismiss) => <BankModalContent initial={kycBankValue(item)} onSuccess={dismiss} />,
      { position: 'center' },
    );
    handle.onDismissed.then(async () => {
      // PUT /me/bank-account already invalidated the spec server-side, but
      // we still need to refetch on the client. Diff completion to know
      // whether to celebrate — the modal closes itself on a successful save,
      // but also closes on a bare cancel/tap-outside, so a non-cancelled
      // close must not be assumed to mean saved.
      await refetch();
      const fresh = itemFor('bankAccount');
      if (fresh?.complete === true && item.complete === false) {
        showToast('Bank account saved', { type: 'success' });
      }
    });
  }

  function openIdentityModal(item: KycItemSpec) {
    const handle = showCustomModal(
      item.label,
      (dismiss) => (
        <IdentityModalContent
          initial={kycIdentityValue(item)}
          validation={item.validation}
          onSubmit={async (submission: IdentitySubmission) => {
            await onboardingApi.saveProfessionalKyc({
              identity: {
                type: identityTypeToWire(submission.method),
                number: submission.number,
                document_upload_key: submission.documentUploadKey,
              },
            });
            await refetch();
            dismiss();
          }}
        />
      ),
      { position: 'center' },
    );
    handle.onDismissed.then(async () => {
      await refetch();
      const fresh = itemFor('identity');
      if (fresh?.complete === true && item.complete === false) {
        showToast('Identity saved', { type: 'success' });
      }
    });
  }

  function openSelfieModal(item: KycItemSpec) {
    const handle = showCustomModal(
      item.label,
      (dismiss) => (
        <SelfieModalContent
          initialKey={kycSelfieValue(item)?.uploadKey}
          onSubmit={async (key) => {
            try {
              await onboardingApi.saveProfessionalKyc({ selfie: { upload_key: key } });
              await refetch();
              dismiss();
            } catch (error) {
              if (error instanceof ApiError && error.reason === 'identity_required_first') {
                showToast('Submit your identity verification before adding a selfie.', { type: 'error' });
                dismiss();
                return;
              }
              throw error;
            }
          }}
        />
      ),
      { position: 'center' },
    );
    handle.onDismissed.then(async () => {
      await refetch();
      const fresh = itemFor('selfie');
      if (fresh?.complete === true && item.complete === false) {
        showToast('Selfie saved', { type: 'success' });
      }
    });
  }

  function openRatesModal(item: KycItemSpec) {
    const handle = showCustomModal(item.label, (dismiss) => <RatesModalContent onDone={dismiss} onRateChanged={refetch} />, { position: 'center' });
    handle.onDismissed.then(() => void refetch());
  }

  async function saveTextField(item: KycItemSpec, value: string) {
    try {
      if (role === 'professional') {
        await onboardingApi.saveProfessionalKyc({ [kycItemKeyToWire(item.key)]: value });
      } else {
        await saveClientField(item.key, value);
      }
      await refetch();
      showToast(`${item.label} saved`, { type: 'success' });
    } catch (error) {
      if (error instanceof ApiError) showErrorFor(item, error);
      else throw error;
    }
  }

  async function saveTagsField(item: KycItemSpec, values: string[]) {
    try {
      if (role === 'professional') {
        await onboardingApi.saveProfessionalKyc({ [kycItemKeyToWire(item.key)]: values });
      } else {
        // For clients today, only `interests` is a tags field.
        await onboardingApi.saveClientKyc({ interests: values });
      }
      await refetch();
      showToast(`${item.label} saved`, { type: 'success' });
    } catch (error) {
      if (error instanceof ApiError) showErrorFor(item, error);
      else throw error;
    }
  }

  /** Client KYC has fewer fields; route to the typed helper rather than the loose-shaped professional endpoint. */
  async function saveClientField(key: KycItemKey, value: string) {
    if (key === 'fullName') return onboardingApi.saveClientKyc({ fullName: value });
    if (key === 'description') return onboardingApi.saveClientKyc({ description: value });
    throw new ApiError({
      statusCode: 400,
      errorCode: 1000,
      reason: 'validation_error',
      message: 'This field is not supported for client onboarding.',
    });
  }

  function showErrorFor(item: KycItemSpec, error: ApiError) {
    let message: string;
    if (error.isValidation) {
      message = error.fieldError(kycItemKeyToWire(item.key)) ?? error.message;
    } else if (error.reason === 'handle_taken') {
      message = 'That handle is already taken.';
    } else if (error.reason === 'handle_reserved') {
      message = 'That handle is reserved. Please pick another.';
    } else if (error.reason === 'handle_invalid_format') {
      message = '3–24 chars, lowercase letters, digits, or underscore.';
    } else {
      message = error.message;
    }
    showToast(message, { type: 'error' });
  }

  return (
    <View>
      {ordered.map((item, i) => {
        const flagged = flaggedSet !== null && flaggedSet.has(kycItemKeyToWire(item.key));
        const locked = flaggedSet !== null && !flagged;
        // Flagged items must NOT render as complete even if their last
        // value is still on file — the admin asked the user to act on them.
        const completed = flagged ? false : item.complete;
        return (
          <View key={item.key + i} style={{ marginTop: i > 0 ? 12 : 0 }}>
            <KycItemTile
              icon={ICON_FOR_KEY[item.key]}
              title={item.label}
              subtitle={flagged ? item.subtitle : summaryFor(item)}
              completed={completed}
              locked={locked}
              onPress={() => open(item)}
            />
          </View>
        );
      })}
    </View>
  );
}

