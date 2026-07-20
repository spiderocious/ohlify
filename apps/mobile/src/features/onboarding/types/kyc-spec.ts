import type { Role } from '@ohlify/core';

import { kycValidationRuleFromJson, type KycValidationRule } from './kyc-validation';

/**
 * Mirrors KycItemSpec / KycSpecResponse from
 * mobile/lib/features/onboarding/types/kyc_spec.dart (itself mirroring
 * packages/api/src/onboarding/types.ts). Stable backend-driven enums so
 * screens switch on `kind` and `key` directly.
 */
export type KycItemKey =
  | 'fullName'
  | 'handle'
  | 'occupation'
  | 'description'
  | 'interests'
  | 'bankAccount'
  | 'identity'
  | 'selfie'
  | 'rates'
  | 'unknown';

const KYC_ITEM_KEY_WIRE: Record<KycItemKey, string> = {
  fullName: 'full_name',
  handle: 'handle',
  occupation: 'occupation',
  description: 'description',
  interests: 'interests',
  bankAccount: 'bank_account',
  identity: 'identity',
  selfie: 'selfie',
  rates: 'rates',
  unknown: 'unknown',
};

export function kycItemKeyToWire(key: KycItemKey): string {
  return KYC_ITEM_KEY_WIRE[key];
}

export function kycItemKeyFromWire(value: string): KycItemKey {
  const entry = Object.entries(KYC_ITEM_KEY_WIRE).find(([, wire]) => wire === value);
  return (entry?.[0] as KycItemKey) ?? 'unknown';
}

export type KycItemKind =
  | 'text'
  | 'textarea'
  | 'tags'
  | 'handle'
  | 'bank'
  | 'identity'
  | 'selfie'
  | 'rates'
  | 'imageUpload'
  | 'unknown';

const KYC_ITEM_KIND_WIRE: Record<KycItemKind, string> = {
  text: 'text',
  textarea: 'textarea',
  tags: 'tags',
  handle: 'handle',
  bank: 'bank',
  identity: 'identity',
  selfie: 'selfie',
  rates: 'rates',
  imageUpload: 'image_upload',
  unknown: 'unknown',
};

export function kycItemKindFromWire(value: string): KycItemKind {
  const entry = Object.entries(KYC_ITEM_KIND_WIRE).find(([, wire]) => wire === value);
  return (entry?.[0] as KycItemKind) ?? 'unknown';
}

export type IdentityType = 'nin' | 'bvn' | 'passport' | 'driversLicense';

const IDENTITY_TYPE_WIRE: Record<IdentityType, string> = {
  nin: 'nin',
  bvn: 'bvn',
  passport: 'passport',
  driversLicense: 'drivers_license',
};

export function identityTypeToWire(type: IdentityType): string {
  return IDENTITY_TYPE_WIRE[type];
}

export function identityTypeFromWire(value: string | undefined): IdentityType | undefined {
  if (!value) return undefined;
  const entry = Object.entries(IDENTITY_TYPE_WIRE).find(([, wire]) => wire === value);
  return entry?.[0] as IdentityType | undefined;
}

export const IDENTITY_TYPE_LABEL: Record<IdentityType, string> = {
  nin: 'NIN',
  bvn: 'BVN',
  passport: 'International Passport',
  driversLicense: "Driver's License",
};

export interface KycBankValue {
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountName: string;
}

function kycBankValueFromJson(json: Record<string, unknown>): KycBankValue {
  return {
    bankCode: json.bank_code as string,
    bankName: json.bank_name as string,
    accountNumberMasked: json.account_number_masked as string,
    accountName: json.account_name as string,
  };
}

export interface KycIdentityValue {
  method: IdentityType;
  idNumberMasked: string;
  documentUploadKey?: string;
}

function kycIdentityValueFromJson(json: Record<string, unknown>): KycIdentityValue {
  return {
    method: identityTypeFromWire(json.method as string | undefined) ?? 'nin',
    idNumberMasked: (json.id_number_masked as string) ?? '',
    documentUploadKey: json.document_upload_key as string | undefined,
  };
}

export interface KycSelfieValue {
  uploadKey: string;
}

function kycSelfieValueFromJson(json: Record<string, unknown>): KycSelfieValue {
  return { uploadKey: json.upload_key as string };
}

export interface KycRateValue {
  id: string;
  callType: string;
  durationMinutes: number;
  priceKobo: number;
}

function kycRateValueFromJson(json: Record<string, unknown>): KycRateValue {
  return {
    id: json.id as string,
    callType: json.call_type as string,
    durationMinutes: json.duration_minutes as number,
    priceKobo: json.price_kobo as number,
  };
}

export interface KycItemSpec {
  key: KycItemKey;
  kind: KycItemKind;
  label: string;
  subtitle: string;
  required: boolean;
  enabled: boolean;
  validation: KycValidationRule[];
  /** Currently-saved value as a raw JSON-decoded value. Use the typed getters below to read it. */
  value: unknown;
  complete: boolean;
}

export function kycItemSpecFromJson(json: Record<string, unknown>): KycItemSpec {
  const rules = ((json.validation as unknown[]) ?? [])
    .map((r) => kycValidationRuleFromJson(r as Record<string, unknown>))
    .filter((r): r is KycValidationRule => r !== null);
  return {
    key: kycItemKeyFromWire(json.key as string),
    kind: kycItemKindFromWire(json.kind as string),
    label: json.label as string,
    subtitle: (json.subtitle as string) ?? '',
    required: (json.required as boolean) ?? true,
    enabled: (json.enabled as boolean) ?? true,
    validation: rules,
    value: json.value,
    complete: (json.complete as boolean) ?? false,
  };
}

export function kycTextValue(item: KycItemSpec): string | undefined {
  return typeof item.value === 'string' ? item.value : undefined;
}

export function kycTagsValue(item: KycItemSpec): string[] | undefined {
  return Array.isArray(item.value) ? item.value.map(String) : undefined;
}

export function kycBankValue(item: KycItemSpec): KycBankValue | undefined {
  return item.value && typeof item.value === 'object' && !Array.isArray(item.value)
    ? kycBankValueFromJson(item.value as Record<string, unknown>)
    : undefined;
}

export function kycIdentityValue(item: KycItemSpec): KycIdentityValue | undefined {
  return item.value && typeof item.value === 'object' && !Array.isArray(item.value)
    ? kycIdentityValueFromJson(item.value as Record<string, unknown>)
    : undefined;
}

export function kycSelfieValue(item: KycItemSpec): KycSelfieValue | undefined {
  return item.value && typeof item.value === 'object' && !Array.isArray(item.value)
    ? kycSelfieValueFromJson(item.value as Record<string, unknown>)
    : undefined;
}

export function kycRatesValue(item: KycItemSpec): KycRateValue[] | undefined {
  return Array.isArray(item.value)
    ? item.value.map((e) => kycRateValueFromJson(e as Record<string, unknown>))
    : undefined;
}

/**
 * Set when the user is in a partial-rejection resubmit state. Drives the
 * item-locking on the KYC screen — only items whose key is in itemKeys
 * remain editable. undefined on the response = no active rejection scope;
 * render the spec normally.
 */
export interface KycResubmission {
  submissionId: string;
  itemKeys: string[];
  /**
   * Subset of itemKeys the user has already touched since the rejection.
   * Drives the Proceed gate — every flagged key must be acknowledged
   * before the user can resubmit. bank_account and rates are passively
   * acknowledged on the server.
   */
  acknowledgedKeys: string[];
  reasonCode: string;
  note?: string;
}

function kycResubmissionFromJson(json: Record<string, unknown>): KycResubmission {
  return {
    submissionId: (json.submission_id as string) ?? '',
    itemKeys: ((json.item_keys as unknown[]) ?? []).map(String),
    acknowledgedKeys: ((json.acknowledged_keys as unknown[]) ?? []).map(String),
    reasonCode: (json.reason_code as string) ?? 'other',
    note: json.note as string | undefined,
  };
}

export interface KycSpecResponse {
  role: Role;
  items: KycItemSpec[];
  completedCount: number;
  totalRequired: number;
  allComplete: boolean;
  /** undefined when there's no active rejection scope. */
  resubmission?: KycResubmission;
}

export function kycSpecResponseFromJson(json: Record<string, unknown>): KycSpecResponse {
  const role = json.role === 'professional' ? 'professional' : 'client';
  const resubmissionRaw = json.resubmission;
  return {
    role,
    items: ((json.items as unknown[]) ?? []).map((e) => kycItemSpecFromJson(e as Record<string, unknown>)),
    completedCount: (json.completed_count as number) ?? 0,
    totalRequired: (json.total_required as number) ?? 0,
    allComplete: (json.all_complete as boolean) ?? false,
    resubmission:
      resubmissionRaw && typeof resubmissionRaw === 'object'
        ? kycResubmissionFromJson(resubmissionRaw as Record<string, unknown>)
        : undefined,
  };
}
