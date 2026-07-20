import {
  AppAvatar,
  AppButton,
  AppIcon,
  AppText,
  AppTextInput,
  InterestsForm,
  OccupationForm,
  ProfessionalView,
  colors,
  showCustomModal,
  showInputModal,
  showToast,
} from '@ohlify/mobile-ui';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { fileService } from '@shared/services/file-service';
import { fileUploadService } from '@shared/services/file-upload-service';

import { profileApi, type SensitiveAction } from '@features/profile/api/profile-api';
import { useMe } from '@features/profile/api/use-me';
import { runSensitiveActionFlow } from '@features/profile/helpers/otp-gate';
import { PersonalInfoDescriptionRow, PersonalInfoInterestsRow, PersonalInfoRow } from './parts/personal-info-row';
import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold';

const EMAIL_REGEX = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;

/** Mirrors mobile/lib/features/profile/screen/personal_info_screen.dart. */
export function PersonalInfoScreen() {
  const me = useMe();
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [description, setDescription] = useState('');
  const [occupation, setOccupation] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (me.data) {
      setName((prev) => prev || me.data.fullName || '');
      setDescription(me.data.description ?? '');
      setOccupation(me.data.occupation ?? '');
      setInterests(me.data.interests);
    }
  }, [me.data]);

  async function saveName() {
    if (savingName) return;
    const value = name.trim();
    if (!value) return;
    setSavingName(true);
    try {
      await profileApi.updateMe({ fullName: value });
      await me.refetch();
      showToast('Full name saved', { type: 'success' });
    } catch (e) {
      showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
    } finally {
      setSavingName(false);
    }
  }

  async function pickAvatar() {
    if (uploadingAvatar) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('Photo library permission is required.', { type: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || result.assets.length === 0) return;
    const picked = result.assets[0];
    if (!picked) return;
    setUploadingAvatar(true);
    try {
      const name_ = picked.fileName ?? `avatar-${Date.now()}.jpg`;
      const key = await fileUploadService.uploadPicked({ uri: picked.uri, name: name_ });
      await fileService.evict(key);
      await profileApi.updateAvatar({ fileKey: key });
      await me.refetch();
      showToast('Profile photo updated', { type: 'success' });
    } catch (e) {
      showToast(`Upload failed: ${e instanceof Error ? e.message : String(e)}`, { type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  }

  function openEditEmail() {
    const currentEmail = me.data?.email ?? '';
    let newEmail: string | undefined;
    let dismiss: () => void = () => undefined;
    const handle = showCustomModal(
      'Edit email',
      (onDismiss) => {
        dismiss = onDismiss;
        return (
          <EditEmailForm
            initial={currentEmail}
            onSubmit={(value) => {
              newEmail = value;
              dismiss();
            }}
          />
        );
      },
      { position: 'center' },
    );
    handle.onDismissed.then(async () => {
      if (!newEmail || newEmail === currentEmail) return;
      const ok = await runSensitiveActionFlow({
        action: 'change_email' as SensitiveAction,
        onSubmit: (otp) => profileApi.changeEmail({ newEmail: newEmail!, otp }),
      });
      if (!ok) return;
      await me.refetch();
      showToast('Email updated', { type: 'success' });
    });
  }

  function openEditPhone() {
    const currentPhone = me.data?.phoneNumber ?? '';
    let newPhone: string | undefined;
    let dismiss: () => void = () => undefined;
    const handle = showCustomModal(
      'Edit phone number',
      (onDismiss) => {
        dismiss = onDismiss;
        return (
          <EditPhoneForm
            initial={currentPhone}
            onSubmit={(value) => {
              newPhone = value;
              dismiss();
            }}
          />
        );
      },
      { position: 'center' },
    );
    handle.onDismissed.then(async () => {
      if (!newPhone || newPhone === currentPhone) return;
      const ok = await runSensitiveActionFlow({
        action: 'change_phone' as SensitiveAction,
        onSubmit: (otp) => profileApi.changePhone({ newPhone: newPhone!, otp }),
      });
      if (!ok) return;
      await me.refetch();
      showToast('Phone number updated', { type: 'success' });
    });
  }

  function openEditDescription() {
    let pendingValue: string | undefined;
    const handle = showInputModal('Edit description', 'Set your description, let people know what you do and who you are.', {
      placeholder: 'Type a short bio…',
      multiline: true,
      maxLength: 500,
      defaultValue: description,
      confirmButtonText: 'Save',
      showCancelButton: false,
      onConfirm: (value) => {
        pendingValue = value.trim();
      },
    });
    handle.onDismissed.then(async () => {
      if (pendingValue === undefined) return;
      setDescription(pendingValue);
      try {
        await profileApi.updateMe({ description: pendingValue });
        showToast('Description updated', { type: 'success' });
      } catch (e) {
        showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
      }
    });
  }

  function openEditOccupation() {
    let pendingValue: string | undefined;
    let dismiss: () => void = () => undefined;
    const handle = showCustomModal(
      'Change occupation',
      (onDismiss) => {
        dismiss = onDismiss;
        return (
          <OccupationForm
            initialValue={occupation || undefined}
            onSave={(value) => {
              pendingValue = value;
              dismiss();
            }}
          />
        );
      },
      { position: 'center' },
    );
    handle.onDismissed.then(async () => {
      if (pendingValue === undefined) return;
      setOccupation(pendingValue);
      try {
        await profileApi.updateMe({ occupation: pendingValue });
        showToast('Occupation updated', { type: 'success' });
      } catch (e) {
        showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
      }
    });
  }

  function openEditInterests() {
    let pendingValues: string[] | undefined;
    let dismiss: () => void = () => undefined;
    const handle = showCustomModal(
      'Change interests',
      (onDismiss) => {
        dismiss = onDismiss;
        return (
          <InterestsForm
            initialInterests={interests}
            onSave={(values) => {
              pendingValues = values;
              dismiss();
            }}
          />
        );
      },
      { position: 'center' },
    );
    handle.onDismissed.then(async () => {
      if (pendingValues === undefined) return;
      setInterests(pendingValues);
      try {
        await profileApi.updateMe({ interests: pendingValues });
        showToast('Interests updated', { type: 'success' });
      } catch (e) {
        showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
      }
    });
  }

  const fullName = me.data?.fullName ?? name;
  const email = me.data?.email ?? '';
  const phone = me.data?.phoneNumber ?? '';
  const avatarKey = me.data?.avatarKey;

  const body = (
    <View>
      <View style={{ alignItems: 'center' }}>
        <Pressable onPress={uploadingAvatar ? undefined : pickAvatar}>
          <View>
            <AppAvatar fileKey={avatarKey} resolveUri={fileService.mintViewUri} name={fullName} size={88} />
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                padding: 6,
                borderRadius: 999,
                backgroundColor: colors.primary,
                borderWidth: 2,
                borderColor: colors.textWhite,
              }}
            >
              <AppIcon name={uploadingAvatar ? 'hourglassTop' : 'cameraAlt'} size={14} color={colors.textWhite} />
            </View>
          </View>
        </Pressable>
      </View>
      <View style={{ height: 14 }} />
      <AppTextInput label="Full Name" value={name} onChangeText={setName} bordered={false} />
      <View style={{ height: 12 }} />
      <AppButton label={savingName ? 'Saving…' : 'Save'} expanded radius={100} isDisabled={savingName} onPress={savingName ? undefined : saveName} />
      <View style={{ height: 16 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <View style={{ width: 10 }} />
        <AppText variant="bodyNormal" color={colors.textMuted} align="center">
          Your name is linked to your Ohlify account
        </AppText>
        <View style={{ width: 10 }} />
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
      <View style={{ height: 20 }} />
      <PersonalInfoRow icon="mailOutline" iconColor="#60A5FA" title="Edit Email Address" subtitle={email} onTap={openEditEmail} />
      <View style={{ height: 12 }} />
      <PersonalInfoRow icon="phone" iconColor={colors.textMuted} title="Edit Phone Number" subtitle={phone} onTap={openEditPhone} />
      <View style={{ height: 12 }} />
      <PersonalInfoDescriptionRow
        icon="article"
        iconColor={colors.textMuted}
        title="Edit Description"
        description={description || 'Not set yet'}
        onTap={openEditDescription}
      />
      <ProfessionalView>
        <View style={{ height: 12 }} />
        <PersonalInfoRow icon="work" iconColor={colors.textMuted} title="Change occupation" subtitle={occupation || 'Not set yet'} onTap={openEditOccupation} />
      </ProfessionalView>
      <View style={{ height: 12 }} />
      <PersonalInfoInterestsRow icon="interests" iconColor="#0D6F82" title="Change interests" interests={interests} onTap={openEditInterests} />
    </View>
  );

  return <ProfileSubscreenScaffold title="Personal Information" body={body} />;
}

function EditEmailForm({ initial, onSubmit }: { initial: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  const isValid = EMAIL_REGEX.test(value);
  const isChanged = value !== initial;

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Change your email address. Changes affect where we send scheduled requests and notifications.
      </AppText>
      <View style={{ height: 16 }} />
      <AppTextInput label="Email address" value={value} onChangeText={setValue} placeholder="Adedeji@gmail.com" keyboardType="email-address" />
      <View style={{ height: 20 }} />
      <AppButton label="Save" expanded radius={100} isDisabled={!isValid || !isChanged} onPress={!isValid || !isChanged ? undefined : () => onSubmit(value.trim())} />
    </View>
  );
}

function EditPhoneForm({ initial, onSubmit }: { initial: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState(initial.startsWith('+234') ? initial.slice(4) : initial);
  const digits = value.replace(/\D/g, '');
  const isValid = digits.length >= 10;
  const e164 = (() => {
    let d = digits;
    if (d.startsWith('0')) d = d.slice(1);
    return `+234${d}`;
  })();
  const isChanged = e164 !== initial;

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Change your phone number. Changes affect where we send scheduled requests and notifications.
      </AppText>
      <View style={{ height: 16 }} />
      <AppText variant="bodyNormal" color={colors.textPrimary} weight="500" align="left">
        Phone number
      </AppText>
      <View style={{ height: 6 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 14,
            backgroundColor: colors.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <AppText variant="body" color={colors.textJet} weight="500" align="left">
            🇳🇬 +234
          </AppText>
        </View>
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}>
          <AppTextInput value={value} onChangeText={setValue} placeholder="808 123 4567" keyboardType="phone-pad" />
        </View>
      </View>
      <View style={{ height: 20 }} />
      <AppButton label="Save" expanded radius={100} isDisabled={!isValid || !isChanged} onPress={!isValid || !isChanged ? undefined : () => onSubmit(e164)} />
    </View>
  );
}
