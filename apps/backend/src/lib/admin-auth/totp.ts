import crypto from 'node:crypto';

import { generateSecret, generateURI, verifySync } from 'otplib';
import qrcode from 'qrcode';

import { env } from '../../env.js';

// TOTP setup + verification + secret encryption.
//
// Secrets are stored encrypted at rest (`admin_users.totp_secret_encrypted`)
// using AES-256-GCM with the key from `ADMIN_TOTP_ENCRYPTION_KEY` env. We
// store ciphertext as `iv:tag:payload` base64 — three colon-separated parts.
//
// Authenticator settings: 30-second window. otplib v13 default tolerance is
// 1 step (so a code typed within ±30s of the TOTP rotation works). We pass
// `epochTolerance: 30` (seconds) explicitly on verify so behavior doesn't
// change across otplib versions.

const ENC_ALGO = 'aes-256-gcm';

const getKey = (): Buffer => {
  // ADMIN_TOTP_ENCRYPTION_KEY is enforced as 64-hex by env schema.
  return Buffer.from(env.ADMIN_TOTP_ENCRYPTION_KEY, 'hex');
};

export const encryptSecret = (plaintext: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
};

export const decryptSecret = (encoded: string): string => {
  const [ivB64, tagB64, ctB64] = encoded.split(':');
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error('totp secret: malformed ciphertext');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = crypto.createDecipheriv(ENC_ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString('utf8');
};

export const generateTotpSecret = (): string => generateSecret();

// otpauth URL is what the QR code encodes — Google Authenticator etc. scan
// this to provision the TOTP.
export const otpauthUrl = (secret: string, label: string, issuer = 'Ohlify Admin'): string =>
  generateURI({ issuer, label, secret });

export const qrCodeDataUrl = async (otpauth: string): Promise<string> => {
  return qrcode.toDataURL(otpauth, { errorCorrectionLevel: 'M', margin: 1, width: 256 });
};

export const verifyCode = (secret: string, code: string): boolean => {
  try {
    const result = verifySync({ secret, token: code, epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
};
