import { z } from 'zod';

import { HANDLE_REGEX } from '@shared/constants/reserved-handles.js';

const otpField = z
  .string()
  .length(6)
  .regex(/^\d{6}$/, 'OTP must be 6 digits');

const e164Phone = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in E.164 format (e.g. +2348012345678)');

const emailField = z.string().email('Invalid email address').max(254, 'Email address too long');

// Avatar is a file_key from the uploads microservice. Alphanumeric plus
// path separators / dots / dashes / underscores. No queries, no schemes.
const avatarFileKey = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9._/-]+$/, 'Avatar file_key must be alphanumeric (with . _ / - allowed)');

export const PatchMeSchema = z
  .object({
    full_name: z.string().min(2).max(120).optional(),
    description: z.string().max(2000).optional(),
    occupation: z.string().min(2).max(120).optional(),
    interests: z.array(z.string().min(1).max(60)).max(20).optional(),
    is_available: z.boolean().optional(),
    handle: z
      .string()
      .min(3)
      .max(24)
      .transform((v) => v.toLowerCase())
      .refine((v) => HANDLE_REGEX.test(v), 'Handle must match ^[a-z0-9_]{3,24}$')
      .optional(),
    categories: z.array(z.string().min(1).max(60)).max(10).optional(),
  })
  .strict();

export const ChangeEmailSchema = z.object({
  new_email: emailField,
  otp: otpField,
});

export const ChangePhoneSchema = z.object({
  new_phone_number: e164Phone,
  otp: otpField,
});

export const VerifyOtpOnlySchema = z.object({
  otp: otpField,
});

export const NotificationPreferencesPatchSchema = z
  .object({
    sms: z.boolean().optional(),
    email: z.boolean().optional(),
    push: z.boolean().optional(),
  })
  .strict();

export const DeleteAccountSchema = z.object({
  otp: otpField,
  confirm: z.literal(true),
});

export const PutBankAccountSchema = z
  .object({
    account_number: z.string().regex(/^\d{8,12}$/, 'account_number must be 8-12 digits'),
    bank_code: z.string().min(2).max(10),
  })
  .strict();

export const PostAvatarSchema = z
  .object({
    file_key: avatarFileKey,
  })
  .strict();

// Booking blocks — recurring time-of-day windows the pro doesn't want
// to be booked in. Saved as a full-list overwrite (PUT semantics).
//
// Minutes are minute-of-day (0..1440) in the pro's local timezone.
// `end_minute` is exclusive; cross-midnight blocks aren't supported in
// v1 — split into two rows if needed (e.g. 22:00–24:00 + 00:00–02:00).
const BookingBlockSchema = z
  .object({
    start_minute: z.number().int().min(0).max(1439),
    end_minute: z.number().int().min(1).max(1440),
  })
  .strict()
  .refine((b) => b.end_minute > b.start_minute, {
    message: 'end_minute must be greater than start_minute',
    path: ['end_minute'],
  });

export const PutBookingBlocksSchema = z
  .object({
    blocks: z.array(BookingBlockSchema).max(20),
  })
  .strict();

export type PutBookingBlocksDto = z.infer<typeof PutBookingBlocksSchema>;

// Device tokens — push notification targets per device. POST upserts,
// DELETE removes (on logout / token rotation).
export const RegisterDeviceTokenSchema = z
  .object({
    token: z.string().min(8).max(4096),
    platform: z.enum(['ios', 'android', 'web']),
    app_version: z.string().max(40).optional(),
  })
  .strict();

export const DeleteDeviceTokenSchema = z
  .object({
    token: z.string().min(8).max(4096),
  })
  .strict();

export type RegisterDeviceTokenDto = z.infer<typeof RegisterDeviceTokenSchema>;
export type DeleteDeviceTokenDto = z.infer<typeof DeleteDeviceTokenSchema>;

export type PatchMeDto = z.infer<typeof PatchMeSchema>;
export type ChangeEmailDto = z.infer<typeof ChangeEmailSchema>;
export type ChangePhoneDto = z.infer<typeof ChangePhoneSchema>;
export type VerifyOtpOnlyDto = z.infer<typeof VerifyOtpOnlySchema>;
export type NotificationPreferencesPatchDto = z.infer<typeof NotificationPreferencesPatchSchema>;
export type DeleteAccountDto = z.infer<typeof DeleteAccountSchema>;
export type PutBankAccountDto = z.infer<typeof PutBankAccountSchema>;
export type PostAvatarDto = z.infer<typeof PostAvatarSchema>;
