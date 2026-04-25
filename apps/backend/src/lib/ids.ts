import { ulid } from 'ulid';

type Prefix = 'usr' | 'bkg' | 'txn' | 'ntf' | 'upl' | 'rat' | 'rvw' | 'tkn' | 'otp' | 'ses';

export const newId = (prefix: Prefix): string => `${prefix}_${ulid()}`;

export const newRawId = (): string => ulid();
