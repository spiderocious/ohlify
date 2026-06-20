import { IconBriefcase, IconFileText, IconHeart, IconMail, IconPhone } from '@icons';
import { useEffect, useState } from 'react';

import {
  AppButton,
  AppText,
  AppTextInput,
  DrawerService,
  InterestsForm,
  OccupationForm,
} from '@ohlify/ui';
import { useMe, type ApiError } from '@ohlify/api';

import { useUpdateMe } from '../api/use-update-me.js';
import { useChangeEmail } from '../api/use-change-email.js';
import { useChangePhone } from '../api/use-change-phone.js';

import { PersonalInfoRow } from './parts/personal-info-row.js';
import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold.js';

const successToast = (m: string) => DrawerService.toast(m, { type: 'success' });
const errorToast = (m: string) => DrawerService.toast(m, { type: 'error' });

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;

function maskEmail(email: string): string {
  const idx = email.indexOf('@');
  if (idx <= 1) return email;
  return `${email[0]}***${email.slice(idx)}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\s/g, '');
  if (digits.length <= 4) return phone;
  return `***${digits.slice(-4)}`;
}

/** Mirrors mobile/lib/features/profile/screen/personal_info_screen.dart. */
export function PersonalInfoScreen() {
  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const changeEmail = useChangeEmail();
  const changePhone = useChangePhone();

  const [name, setName] = useState(me?.full_name ?? '');
  useEffect(() => setName(me?.full_name ?? ''), [me?.full_name]);

  const openEditEmail = () => {
    let pending: string | undefined;
    let close: (() => void) | null = null;
    const handle = DrawerService.showCustomModal(
      'Edit email',
      (dismiss) => {
        close = dismiss;
        return (
          <EditEmailForm
            initial={me?.email ?? ''}
            onSubmit={(v) => {
              pending = v;
              close?.();
            }}
          />
        );
      },
      { position: 'center' },
    );
    void handle.onDismissed.then(() => {
      if (!pending || pending === me?.email) return;
      const newEmail = pending;
      DrawerService.showInputModal(
        'Enter OTP',
        `We sent a 6-digit code to ${maskEmail(me?.email ?? '')} to confirm this change.`,
        {
          placeholder: '000000',
          maxLength: 6,
          confirmButtonText: 'Confirm',
          showCancelButton: true,
          onConfirm: (otp) => {
            changeEmail.mutate(
              { new_email: newEmail, otp },
              {
                onSuccess: () => successToast('Email updated'),
                onError: (err) => {
                  const e = err as unknown as ApiError;
                  errorToast(
                    e.reason === 'invalid_otp' ? 'Invalid OTP code' : 'Failed to update email',
                  );
                },
              },
            );
          },
        },
      );
    });
  };

  const openEditPhone = () => {
    let pending: string | undefined;
    let close: (() => void) | null = null;
    const handle = DrawerService.showCustomModal(
      'Edit phone number',
      (dismiss) => {
        close = dismiss;
        return (
          <EditPhoneForm
            initial={me?.phone_number ?? ''}
            onSubmit={(v) => {
              pending = v;
              close?.();
            }}
          />
        );
      },
      { position: 'center' },
    );
    void handle.onDismissed.then(() => {
      if (!pending || pending === me?.phone_number) return;
      const newPhone = pending;
      DrawerService.showInputModal(
        'Enter OTP',
        `We sent a 6-digit code to ${maskPhone(me?.phone_number ?? '')} to confirm this change.`,
        {
          placeholder: '000000',
          maxLength: 6,
          confirmButtonText: 'Confirm',
          showCancelButton: true,
          onConfirm: (otp) => {
            changePhone.mutate(
              { new_phone_number: newPhone, otp },
              {
                onSuccess: () => successToast('Phone number updated'),
                onError: (err) => {
                  const e = err as unknown as ApiError;
                  errorToast(
                    e.reason === 'invalid_otp' ? 'Invalid OTP code' : 'Failed to update phone',
                  );
                },
              },
            );
          },
        },
      );
    });
  };

  const openEditDescription = () => {
    let pending: string | undefined;
    const handle = DrawerService.showInputModal(
      'Edit description',
      'Set your description, let people know what you do and who you are.',
      {
        placeholder: 'Type your description here...',
        multiline: true,
        maxLength: 500,
        defaultValue: me?.description ?? '',
        confirmButtonText: 'Save',
        showCancelButton: false,
        onConfirm: (v) => {
          pending = v.trim();
        },
      },
    );
    void handle.onDismissed.then(() => {
      if (pending !== undefined) {
        updateMe.mutate(
          { description: pending },
          { onSuccess: () => successToast('Description updated') },
        );
      }
    });
  };

  const openEditOccupation = () => {
    let pending: string | undefined;
    let close: (() => void) | null = null;
    const handle = DrawerService.showCustomModal(
      'Change occupation',
      (dismiss) => {
        close = dismiss;
        return (
          <OccupationForm
            initialValue={me?.occupation ?? ''}
            onSave={(v) => {
              pending = v;
              close?.();
            }}
          />
        );
      },
      { position: 'center' },
    );
    void handle.onDismissed.then(() => {
      if (pending) {
        updateMe.mutate(
          { occupation: pending },
          { onSuccess: () => successToast('Occupation updated') },
        );
      }
    });
  };

  const openEditInterests = () => {
    let pending: string[] | undefined;
    let close: (() => void) | null = null;
    const handle = DrawerService.showCustomModal(
      'Change interests',
      (dismiss) => {
        close = dismiss;
        return (
          <InterestsForm
            initialInterests={me?.interests ?? []}
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
      if (pending) {
        updateMe.mutate(
          { interests: pending },
          { onSuccess: () => successToast('Interests updated') },
        );
      }
    });
  };

  return (
    <ProfileSubscreenScaffold title="Personal Information">
      <div className="space-y-4">
        <AppTextInput label="Full Name" bordered={false} value={name} onChange={setName} />
        <AppButton
          label="Save"
          expanded
          radius={100}
          isLoading={updateMe.isPending}
          onPressed={() => {
            updateMe.mutate(
              { full_name: name.trim() },
              { onSuccess: () => successToast('Full name saved') },
            );
          }}
        />
        <div className="flex items-center gap-3 py-2">
          <span className="h-px flex-1 bg-border" />
          <AppText variant="bodyNormal" align="center" color="var(--ohl-text-muted)">
            Your name is linked to your Ohlify account
          </AppText>
          <span className="h-px flex-1 bg-border" />
        </div>

        <PersonalInfoRow
          Icon={IconMail}
          iconColor="#60A5FA"
          title="Edit Email Address"
          subtitle={me?.email ?? ''}
          onTap={openEditEmail}
        />
        <PersonalInfoRow
          Icon={IconPhone}
          title="Edit Phone Number"
          subtitle={me?.phone_number ?? ''}
          onTap={openEditPhone}
        />
        <PersonalInfoRow
          Icon={IconFileText}
          title="Edit Description"
          subtitle={me?.description || 'Not set yet'}
          onTap={openEditDescription}
        />
        <PersonalInfoRow
          Icon={IconBriefcase}
          title="Change occupation"
          subtitle={me?.occupation || 'Not set yet'}
          onTap={openEditOccupation}
        />
        <PersonalInfoRow
          Icon={IconHeart}
          iconColor="#0D6F82"
          title="Change interests"
          subtitle={
            (me?.interests ?? []).length === 0 ? 'Not set yet' : (me?.interests ?? []).join(', ')
          }
          onTap={openEditInterests}
        />
      </div>
    </ProfileSubscreenScaffold>
  );
}

interface EditEmailFormProps {
  initial: string;
  onSubmit: (value: string) => void;
}

function EditEmailForm({ initial, onSubmit }: EditEmailFormProps) {
  const [value, setValue] = useState(initial);
  const isValid = EMAIL_RE.test(value);
  const isChanged = value !== initial;
  return (
    <div className="space-y-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        Change your email address. Changes affect where we send scheduled requests and
        notifications.
      </AppText>
      <AppTextInput
        label="Email address"
        placeholder="adedeji@gmail.com"
        inputType="email"
        inputMode="email"
        value={value}
        onChange={setValue}
      />
      <AppButton
        label="Save"
        expanded
        radius={100}
        isDisabled={!isValid || !isChanged}
        onPressed={isValid && isChanged ? () => onSubmit(value.trim()) : undefined}
      />
    </div>
  );
}

interface EditPhoneFormProps {
  initial: string;
  onSubmit: (value: string) => void;
}

function EditPhoneForm({ initial, onSubmit }: EditPhoneFormProps) {
  const [value, setValue] = useState(initial);
  const digits = value.replace(/\D/g, '');
  const isValid = digits.length >= 10;
  const isChanged = value !== initial;

  return (
    <div className="space-y-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        Changes affect where we send scheduled requests and notifications.
      </AppText>
      <div>
        <AppText variant="bodyNormal" weight={500} align="start">
          Phone number
        </AppText>
        <div className="mt-1.5 flex items-stretch gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-3.5 font-sans text-base font-medium">
            🇳🇬 +234
          </span>
          <div className="flex-1">
            <AppTextInput
              placeholder="808 123 4567"
              inputType="tel"
              inputMode="tel"
              value={value}
              onChange={setValue}
            />
          </div>
        </div>
      </div>
      <AppButton
        label="Save"
        expanded
        radius={100}
        isDisabled={!isValid || !isChanged}
        onPressed={isValid && isChanged ? () => onSubmit(value.trim()) : undefined}
      />
    </div>
  );
}
