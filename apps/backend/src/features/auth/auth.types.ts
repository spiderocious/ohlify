export interface AuthUser {
  id: string;
  role: string;
  jti: string;
}

export type UserRole = 'client' | 'professional';
export type UserStatus = 'active' | 'suspended' | 'blocked' | 'deleted';
export type OtpPurpose =
  | 'register'
  | 'login'
  | 'forgot_password'
  | 'change_email'
  | 'change_phone'
  | 'change_password'
  | 'delete_account'
  | 'public_guest';

export type SensitiveAction =
  | 'change_email'
  | 'change_phone'
  | 'change_password'
  | 'delete_account';

export interface UserRow {
  id: string;
  role: UserRole;
  status: UserStatus;
  email: string;
  email_verified_at: Date | null;
  phone_number: string;
  phone_verified_at: Date | null;
  password_hash: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  kyc_status: string;
  last_seen_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export interface OtpRow {
  id: string;
  purpose: OtpPurpose;
  subject_key: string;
  code_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
}

export interface RegTokenRow {
  token_hash: string;
  email: string;
  phone_number: string;
  channel: 'email' | 'sms';
  password_hash: string | null;
  otp_code_id: string | null;
  expires_at: Date;
  consumed_at: Date | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
