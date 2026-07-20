import { AppButton, AppIcon, AppText, colors, showToast } from '@ohlify/mobile-ui';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fileUploadService } from '@shared/services/file-upload-service';

/** Mirrors mobile/lib/features/onboarding/screen/parts/selfie_modal_content.dart. */
export interface SelfieModalContentProps {
  initialKey?: string;
  onSubmit: (uploadKey: string) => Promise<void>;
}

export function SelfieModalContent({ initialKey, onSubmit }: SelfieModalContentProps) {
  const [key, setKey] = useState<string | undefined>(initialKey);
  const [fileName, setFileName] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string>();

  const canSubmit = key !== undefined && !uploading && !saving;

  async function pickAndUpload() {
    setUploadError(undefined);
    setUploading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setUploadError('Photo library permission is required to upload a selfie.');
        setUploading(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
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
      const name = picked.fileName ?? `selfie-${Date.now()}.jpg`;
      const uploadKey = await fileUploadService.uploadPicked({ uri: picked.uri, name });
      setKey(uploadKey);
      setFileName(name);
    } catch (error) {
      setUploadError(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!canSubmit || !key) return;
    setSaving(true);
    try {
      await onSubmit(key);
    } catch (error) {
      showToast(`Could not save selfie: ${error instanceof Error ? error.message : String(error)}`, { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const hasFile = key !== undefined;

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Take a clear photo of your face. We compare it with your submitted ID.
      </AppText>
      <View style={{ height: 16 }} />
      <Pressable onPress={uploading ? undefined : pickAndUpload}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 18,
            backgroundColor: colors.background,
            borderRadius: 12,
            borderWidth: hasFile ? 1.5 : 1,
            borderColor: hasFile ? colors.primary : colors.border,
          }}
        >
          <AppIcon name={hasFile ? 'checkCircle' : 'cameraAlt'} size={22} color={hasFile ? colors.primary : colors.textMuted} />
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <AppText variant="body" color={hasFile ? colors.textPrimary : colors.textSlate} align="left" numberOfLines={1}>
              {uploading ? 'Uploading…' : hasFile ? (fileName ?? 'Selfie uploaded') : 'Tap to take or upload a selfie'}
            </AppText>
          </View>
        </View>
      </Pressable>
      {uploadError ? (
        <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 12, color: colors.error, marginTop: 8 }}>{uploadError}</Text>
      ) : null}
      <View style={{ height: 20 }} />
      <AppButton label={saving ? 'Saving…' : 'Save selfie'} expanded radius={100} isDisabled={!canSubmit} onPress={canSubmit ? save : undefined} />
    </View>
  );
}
