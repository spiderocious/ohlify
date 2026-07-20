import { AppButton, AppDropdownInput, AppIcon, AppText, AppTextInput, colors, showToast, type DropdownOption } from '@ohlify/mobile-ui';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fileUploadService } from '@shared/services/file-upload-service';

import {
  IDENTITY_TYPE_LABEL,
  identityTypeToWire,
  type IdentityType,
  type KycIdentityValue,
} from '@features/onboarding/types/kyc-spec';
import { findRule, type KycValidationRule } from '@features/onboarding/types/kyc-validation';

/**
 * Submission shape sent to the parent — all three pieces are required for
 * the backend to mark identity as complete. Mirrors
 * mobile/lib/features/onboarding/screen/parts/identity_modal_content.dart.
 */
export interface IdentitySubmission {
  method: IdentityType;
  number: string;
  documentUploadKey: string;
}

export interface IdentityModalContentProps {
  initial?: KycIdentityValue;
  validation: KycValidationRule[];
  onSubmit: (submission: IdentitySubmission) => Promise<void>;
}

const ALL_IDENTITY_TYPES: IdentityType[] = ['nin', 'bvn', 'passport', 'driversLicense'];

function allowedMethods(validation: KycValidationRule[]): IdentityType[] {
  const rule = findRule(validation, 'allowed_id_methods');
  if (!rule) return ALL_IDENTITY_TYPES;
  const allowed = rule.value
    .map((v) => {
      switch (v) {
        case 'nin':
          return 'nin' as const;
        case 'bvn':
          return 'bvn' as const;
        case 'passport':
          return 'passport' as const;
        case 'drivers_license':
          return 'driversLicense' as const;
        default:
          return undefined;
      }
    })
    .filter((t): t is IdentityType => t !== undefined);
  return allowed.length === 0 ? ALL_IDENTITY_TYPES : allowed;
}

function regexForMethod(validation: KycValidationRule[], method: IdentityType): RegExp | undefined {
  const rule = findRule(validation, 'id_number_per_method');
  const pattern = rule?.value[identityTypeToWire(method)];
  if (!pattern) return undefined;
  try {
    return new RegExp(pattern);
  } catch {
    return undefined;
  }
}

export function IdentityModalContent({ initial, validation, onSubmit }: IdentityModalContentProps) {
  const methods = allowedMethods(validation);
  const [method, setMethod] = useState<IdentityType>(initial?.method ?? methods[0] ?? 'nin');
  const [number, setNumber] = useState('');
  const [docKey, setDocKey] = useState<string | undefined>(initial?.documentUploadKey);
  const [docFileName, setDocFileName] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string>();

  const idValid = (() => {
    const trimmed = number.trim();
    if (trimmed.length < 4) return false;
    const regex = regexForMethod(validation, method);
    return !regex || regex.test(trimmed);
  })();

  const canSubmit = idValid && docKey !== undefined && !uploading && !saving;

  async function pickAndUpload() {
    setUploadError(undefined);
    setUploading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || result.assets.length === 0) {
        setUploading(false);
        return;
      }
      const picked = result.assets[0];
      if (!picked) {
        setUploading(false);
        return;
      }
      const key = await fileUploadService.uploadPicked({ uri: picked.uri, name: picked.name });
      setDocKey(key);
      setDocFileName(picked.name);
    } catch (error) {
      setUploadError(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!canSubmit || !docKey) return;
    setSaving(true);
    try {
      await onSubmit({ method, number: number.trim(), documentUploadKey: docKey });
    } catch (error) {
      showToast(`Could not save identity: ${error instanceof Error ? error.message : String(error)}`, { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const options: DropdownOption<IdentityType>[] = methods.map((m) => ({ label: IDENTITY_TYPE_LABEL[m], value: m }));
  const initialMasked = initial?.idNumberMasked;

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Pick a verification method, enter the matching ID number, and upload a clear photo of the document.
      </AppText>
      <View style={{ height: 16 }} />
      <AppDropdownInput
        label="Verification method"
        options={options}
        value={method}
        bordered
        onChange={(v) => {
          setMethod(v);
          setNumber('');
        }}
      />
      <View style={{ height: 14 }} />
      <AppTextInput
        label={initialMasked ? `ID number (current: ${initialMasked})` : 'ID number'}
        placeholder="Enter ID number"
        value={number}
        onChangeText={setNumber}
        errorMessage={number.length > 0 && !idValid ? `Doesn't match the expected format for ${IDENTITY_TYPE_LABEL[method]}.` : undefined}
      />
      <View style={{ height: 14 }} />
      <DocumentField fileName={docFileName ?? (docKey ? 'Document uploaded' : undefined)} uploading={uploading} onPick={pickAndUpload} />
      {uploadError ? (
        <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 12, color: colors.error, marginTop: 8 }}>{uploadError}</Text>
      ) : null}
      <View style={{ height: 20 }} />
      <AppButton
        label={saving ? 'Saving…' : 'Save and proceed'}
        expanded
        radius={100}
        isDisabled={!canSubmit}
        onPress={canSubmit ? save : undefined}
      />
    </View>
  );
}

function DocumentField({ fileName, uploading, onPick }: { fileName?: string; uploading: boolean; onPick: () => void }) {
  const hasFile = fileName !== undefined;
  return (
    <View>
      <Text style={{ fontFamily: 'MonaSans-Medium', fontSize: 13, fontWeight: '500', color: colors.textPrimary, marginBottom: 6 }}>
        ID document
      </Text>
      <Pressable onPress={uploading ? undefined : onPick}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: colors.background,
            borderRadius: 12,
            borderWidth: hasFile ? 1.5 : 1,
            borderColor: hasFile ? colors.primary : colors.border,
          }}
        >
          <AppIcon name={hasFile ? 'insertDriveFile' : 'uploadFile'} size={20} color={hasFile ? colors.primary : colors.textMuted} />
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <AppText variant="body" color={hasFile ? colors.textPrimary : colors.textSlate} align="left" numberOfLines={1}>
              {uploading ? 'Uploading…' : hasFile ? fileName : 'Tap to select a photo (JPG, PNG, PDF)'}
            </AppText>
          </View>
          {hasFile ? <AppIcon name="checkCircle" size={18} color={colors.success} /> : null}
        </View>
      </Pressable>
    </View>
  );
}
