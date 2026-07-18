import { useState } from 'react';

import {
  AppButton,
  AppDropdownInput,
  AppText,
  AppTextInput,
  type DropdownOption,
} from '@ohlify/ui';
import type { IdentityType, KycValidationRule } from '@ohlify/api';

import { uploadFile, useFilePreview } from '@ohlify/api';

export interface IdentitySubmission {
  type: IdentityType;
  number: string;
  document_upload_key: string;
}

interface IdentityModalContentProps {
  /** Current saved values (masked) so the form shows what's already on file. */
  initial?: {
    method: IdentityType;
    id_number_masked: string;
    document_upload_key: string | null;
  } | null;
  validation: KycValidationRule[];
  onSubmit: (s: IdentitySubmission) => Promise<void>;
  onSuccess?: () => void;
}

const METHOD_LABELS: Record<IdentityType, string> = {
  nin: 'NIN',
  bvn: 'BVN',
  passport: 'Passport',
  drivers_license: 'Driver’s license',
};

/** Pull the per-method regex from `id_number_per_method` rule, if present. */
function regexForMethod(rules: KycValidationRule[], method: IdentityType): RegExp | null {
  for (const r of rules) {
    if (r.rule === 'id_number_per_method') {
      const entry = r.value[method];
      if (entry?.rule === 'regex') {
        try {
          return new RegExp(entry.value);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Read the allowed methods from validation rules; default to all four. */
function allowedMethods(rules: KycValidationRule[]): IdentityType[] {
  for (const r of rules) {
    if (r.rule === 'allowed_id_methods') return r.value;
  }
  return ['nin', 'bvn', 'passport', 'drivers_license'];
}

export function IdentityModalContent({
  initial,
  validation,
  onSubmit,
  onSuccess,
}: IdentityModalContentProps) {
  const methodOptions: DropdownOption<IdentityType>[] = allowedMethods(validation).map((m) => ({
    label: METHOD_LABELS[m],
    value: m,
  }));

  const [method, setMethod] = useState<IdentityType>(
    initial?.method ?? methodOptions[0]?.value ?? 'nin',
  );
  const [idNumber, setIdNumber] = useState('');
  const [docKey, setDocKey] = useState<string | null>(initial?.document_upload_key ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { uri: previewUri } = useFilePreview(docKey);

  const idRegex = regexForMethod(validation, method);
  const idValid = idNumber.trim().length >= 4 && (idRegex ? idRegex.test(idNumber.trim()) : true);
  const canSubmit = idValid && docKey !== null && !isUploading && !isSaving;

  const handleFile = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    try {
      const { key } = await uploadFile(file);
      setDocKey(key);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canSubmit || !docKey) return;
    setUploadError(null);
    setIsSaving(true);
    try {
      await onSubmit({ type: method, number: idNumber.trim(), document_upload_key: docKey });
      onSuccess?.();
    } catch (err) {
      // Surface the save failure instead of swallowing it. (BUG-kyc-professional-cw-03.)
      setUploadError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not save your identity. Please try again.',
      );
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        Pick a verification method, enter the matching ID number, and upload a clear photo of the
        document.
      </AppText>

      <AppDropdownInput
        label="Verification method"
        options={methodOptions}
        value={method}
        onChange={(v) => {
          setMethod(v as IdentityType);
          setIdNumber('');
        }}
        bordered
      />

      <AppTextInput
        label={
          initial?.id_number_masked
            ? `ID number (current: ${initial.id_number_masked})`
            : 'ID number'
        }
        placeholder="Enter ID number"
        value={idNumber}
        onChange={setIdNumber}
        errorMessage={
          idNumber !== '' && !idValid
            ? `Doesn’t match the expected format for ${METHOD_LABELS[method]}.`
            : undefined
        }
      />

      <div>
        <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
          Photo of the document
        </AppText>
        <div className="mt-2">
          {previewUri ? (
            <div className="relative overflow-hidden rounded-2xl border border-border">
              <img
                src={previewUri}
                alt="ID document preview"
                className="h-48 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setDocKey(null)}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white"
              >
                Replace
              </button>
            </div>
          ) : (
            <label className="flex h-48 w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface text-text-muted hover:border-primary/60">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              <span className="text-sm">
                {isUploading ? 'Uploading…' : 'Tap to upload a photo (JPG, PNG, or PDF)'}
              </span>
            </label>
          )}
        </div>
        {uploadError ? <p className="mt-1.5 text-xs text-error">{uploadError}</p> : null}
      </div>

      <AppButton
        label={isSaving ? 'Saving…' : 'Save and proceed'}
        expanded
        radius={100}
        isDisabled={!canSubmit}
        isLoading={isSaving}
        onPressed={handleSave}
      />
    </div>
  );
}
