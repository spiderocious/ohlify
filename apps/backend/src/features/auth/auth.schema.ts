import { z } from 'zod';

const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const e164Phone = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in E.164 format (e.g. +2348012345678)');

export const RegisterInitiateSchema = z.object({
  email: z.string().email('Invalid email address').max(254, 'Email address too long'),
  phone: e164Phone,
  channel: z.enum(['email', 'sms']),
});

export const RegisterSetPasswordSchema = z.object({
  registration_token: z.string().min(1),
  password: passwordPolicy,
});

export const RegisterVerifySchema = z.object({
  registration_token: z.string().min(1),
  otp: z
    .string()
    // Message on .length too — otherwise a wrong-length OTP returns Zod's raw
    // "String must contain exactly 6 character(s)" instead of the intended copy.
    // (BUG-auth-register-02.)
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const ResendOtpSchema = z.object({
  registration_token: z.string().min(1),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').max(254, 'Email address too long'),
  password: z.string().min(1),
});

export const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export const LogoutSchema = z.object({
  refresh_token: z.string().min(1),
});

export const ForgotPasswordInitiateSchema = z.object({
  email: z.string().email('Invalid email address').max(254, 'Email address too long'),
});

export const ForgotPasswordVerifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').max(254, 'Email address too long'),
  otp: z
    .string()
    // Message on .length too — otherwise a wrong-length OTP returns Zod's raw
    // "String must contain exactly 6 character(s)" instead of the intended copy.
    // (BUG-auth-register-02.)
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const ForgotPasswordResetSchema = z.object({
  reset_token: z.string().min(1),
  new_password: passwordPolicy,
});

export const ChangePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: passwordPolicy,
  otp: z
    .string()
    // Message on .length too — otherwise a wrong-length OTP returns Zod's raw
    // "String must contain exactly 6 character(s)" instead of the intended copy.
    // (BUG-auth-register-02.)
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const SensitiveActionOtpSchema = z.object({
  action: z.enum(['change_email', 'change_phone', 'change_password', 'delete_account']),
});

export type RegisterInitiateDto = z.infer<typeof RegisterInitiateSchema>;
export type RegisterSetPasswordDto = z.infer<typeof RegisterSetPasswordSchema>;
export type RegisterVerifyDto = z.infer<typeof RegisterVerifySchema>;
export type ResendOtpDto = z.infer<typeof ResendOtpSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshDto = z.infer<typeof RefreshSchema>;
export type LogoutDto = z.infer<typeof LogoutSchema>;
export type ForgotPasswordInitiateDto = z.infer<typeof ForgotPasswordInitiateSchema>;
export type ForgotPasswordVerifyOtpDto = z.infer<typeof ForgotPasswordVerifyOtpSchema>;
export type ForgotPasswordResetDto = z.infer<typeof ForgotPasswordResetSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
export type SensitiveActionOtpDto = z.infer<typeof SensitiveActionOtpSchema>;
