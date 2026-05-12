import type { AdminRole } from '@lib/admin-auth/jwt.js';

export interface AdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  totp_secret_encrypted: string | null;
  totp_enabled: boolean;
  role: AdminRole;
  full_name: string | null;
  status: string;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdminSessionRow {
  id: string;
  admin_user_id: string;
  refresh_token_hash: string;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  last_seen_at: Date;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
}

export interface AdminLoginView {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  totp_required: boolean;
  admin: {
    id: string;
    email: string;
    full_name: string | null;
    role: AdminRole;
    totp_enabled: boolean;
  };
}
