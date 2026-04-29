import { ulid } from 'ulidx';

// Prefixes match the conventions doc exactly
type Prefix =
  | 'u' // user
  | 'p' // professional profile
  | 'c' // call / booking
  | 'tx' // transaction
  | 'rv' // review
  | 'rate' // rate
  | 'wd' // withdrawal
  | 'n' // notification
  | 'up' // upload
  | 'bn' // bank account
  | 'g' // guest session
  | 'otp' // otp record
  | 'rt' // refresh token
  | 'kyc' // kyc submission
  | 'we' // wallet entry
  | 'pay' // payment
  | 'tk' // ticket
  | 'ban' // banner
  | 'acct' // account (wallet account)
  | 'je' // journal entry
  | 'out' // outbox event
  | 'pwh' // paystack webhook envelope
  | 'rfd' // refund request
  | 'bk' // booking
  | 'ce' // call event
  | 'str'; // professional strike

export const id = (prefix: Prefix): string => `${prefix}_${ulid().toLowerCase()}`;

export const newRawId = (): string => ulid().toLowerCase();
