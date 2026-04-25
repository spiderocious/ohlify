import { ulid } from 'ulidx';

// Prefixes match the conventions doc exactly
type Prefix =
  | 'u'    // user
  | 'p'    // professional profile
  | 'c'    // call / booking
  | 'tx'   // transaction
  | 'rv'   // review
  | 'rate' // rate
  | 'wd'   // withdrawal
  | 'n'    // notification
  | 'up'   // upload
  | 'bn'   // bank account
  | 'g'    // guest session
  | 'otp'  // otp record
  | 'rt';  // refresh token

export const id = (prefix: Prefix): string => `${prefix}_${ulid().toLowerCase()}`;

export const newRawId = (): string => ulid().toLowerCase();
