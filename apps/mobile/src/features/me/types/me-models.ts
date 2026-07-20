import type { CallType } from '@ohlify/core';

/**
 * DTOs for the slice of /me/* and /banks/* endpoints touched by KYC and the
 * profile flow. Mirrors mobile/lib/features/me/types/me_models.dart (names
 * mirror packages/api/src/profile/types.ts).
 */
export interface Bank {
  code: string;
  name: string;
  logoUrl?: string;
}

export function bankFromJson(json: Record<string, unknown>): Bank {
  return {
    code: json.code as string,
    name: json.name as string,
    logoUrl: json.logo_url as string | undefined,
  };
}

export interface BankAccount {
  accountNumber: string;
  accountNumberMasked: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  addedAt?: string;
}

export function bankAccountFromJson(json: Record<string, unknown>): BankAccount {
  return {
    accountNumber: (json.account_number as string) ?? '',
    accountNumberMasked: (json.account_number_masked as string) ?? '',
    bankCode: json.bank_code as string,
    bankName: json.bank_name as string,
    accountName: json.account_name as string,
    addedAt: json.added_at as string | undefined,
  };
}

export type { CallType };

export interface Rate {
  id: string;
  callType: CallType;
  durationMinutes: number;
  priceKobo: number;
  currency: string;
  /** Derived per-minute price (floored), from the backend. Older responses may omit it. */
  pricePerMinuteKobo?: number;
}

export function rateFromJson(json: Record<string, unknown>): Rate {
  return {
    id: json.id as string,
    callType: json.call_type === 'video' ? 'video' : 'audio',
    durationMinutes: json.duration_minutes as number,
    priceKobo: json.price_kobo as number,
    currency: (json.currency as string) ?? 'NGN',
    pricePerMinuteKobo: json.price_per_minute_kobo as number | undefined,
  };
}

export interface NotificationPreferences {
  sms: boolean;
  email: boolean;
  push: boolean;
}

function boolFlag(json: Record<string, unknown>, key: string): boolean {
  const raw = json[key];
  if (raw && typeof raw === 'object') return Boolean((raw as Record<string, unknown>).enabled);
  if (typeof raw === 'boolean') return raw;
  return false;
}

export function notificationPreferencesFromJson(json: Record<string, unknown>): NotificationPreferences {
  return {
    sms: boolFlag(json, 'sms'),
    email: boolFlag(json, 'email'),
    push: boolFlag(json, 'push'),
  };
}

/**
 * Recurring "do not book me here" window. Minutes are minute-of-day in the
 * pro's local timezone (today: platform default Africa/Lagos). endMinute is
 * exclusive; cross-midnight blocks aren't supported in v1.
 */
export interface BookingBlock {
  startMinute: number;
  endMinute: number;
}

export function bookingBlockFromJson(json: Record<string, unknown>): BookingBlock {
  return {
    startMinute: json.start_minute as number,
    endMinute: json.end_minute as number,
  };
}

export function bookingBlockToJson(block: BookingBlock): Record<string, unknown> {
  return { start_minute: block.startMinute, end_minute: block.endMinute };
}
