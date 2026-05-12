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
  | 'str' // strike (formerly professional_strike — now unified)
  | 'asn' // admin session
  | 'al' // admin audit log
  | 'adm' // admin user
  | 'rep' // user report
  | 'blk' // booking block (pro do-not-book window)
  | 'faq'; // faq

export const id = (prefix: Prefix): string => `${prefix}_${ulid().toLowerCase()}`;

export const newRawId = (): string => ulid().toLowerCase();
