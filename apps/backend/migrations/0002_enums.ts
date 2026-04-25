import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`CREATE TYPE user_role AS ENUM ('client', 'professional')`);
  pgm.sql(`CREATE TYPE user_status AS ENUM ('active', 'suspended', 'blocked', 'deleted')`);
  pgm.sql(`CREATE TYPE kyc_status AS ENUM ('none', 'pending_review', 'approved', 'rejected')`);
  pgm.sql(`CREATE TYPE otp_purpose AS ENUM (
    'register', 'login', 'forgot_password',
    'change_email', 'change_phone', 'change_password',
    'delete_account', 'public_guest'
  )`);
  pgm.sql(`CREATE TYPE call_type AS ENUM ('audio', 'video')`);
  pgm.sql(`CREATE TYPE call_status AS ENUM (
    'pending_payment', 'scheduled', 'active', 'completed', 'cancelled', 'missed'
  )`);
  pgm.sql(`CREATE TYPE payment_status AS ENUM (
    'pending', 'success', 'failed', 'refunded', 'partially_refunded'
  )`);
  pgm.sql(`CREATE TYPE tx_type AS ENUM (
    'call_payment_audio', 'call_payment_video',
    'call_earning_audio', 'call_earning_video',
    'platform_fee', 'refund', 'withdrawal', 'withdrawal_reversal',
    'adjustment'
  )`);
  pgm.sql(`CREATE TYPE tx_status AS ENUM ('pending', 'completed', 'failed', 'reversed')`);
  pgm.sql(`CREATE TYPE withdrawal_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'reversed'
  )`);
  pgm.sql(`CREATE TYPE notification_kind AS ENUM (
    'missed_call', 'upcoming_call', 'payment_received', 'call_scheduled',
    'call_cancelled', 'call_rescheduled', 'review_received',
    'withdrawal_processed', 'system'
  )`);
  pgm.sql(`CREATE TYPE upload_purpose AS ENUM (
    'avatar', 'cover', 'kyc_id', 'ticket_attachment', 'banner'
  )`);
  pgm.sql(`CREATE TYPE banner_placement AS ENUM ('home_top', 'home_inline', 'web_landing')`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TYPE IF EXISTS banner_placement');
  pgm.sql('DROP TYPE IF EXISTS upload_purpose');
  pgm.sql('DROP TYPE IF EXISTS notification_kind');
  pgm.sql('DROP TYPE IF EXISTS withdrawal_status');
  pgm.sql('DROP TYPE IF EXISTS tx_status');
  pgm.sql('DROP TYPE IF EXISTS tx_type');
  pgm.sql('DROP TYPE IF EXISTS payment_status');
  pgm.sql('DROP TYPE IF EXISTS call_status');
  pgm.sql('DROP TYPE IF EXISTS call_type');
  pgm.sql('DROP TYPE IF EXISTS otp_purpose');
  pgm.sql('DROP TYPE IF EXISTS kyc_status');
  pgm.sql('DROP TYPE IF EXISTS user_status');
  pgm.sql('DROP TYPE IF EXISTS user_role');
};
