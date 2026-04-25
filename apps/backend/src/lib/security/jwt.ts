import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

import { UnauthorizedError } from '@lib/errors.js';
import { newRawId } from '@lib/ids.js';

import { env } from '../../env.js';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  jti: string;
  iat: number;
  exp: number;
}

export const signAccessToken = (payload: { sub: string; role: string }): string =>
  jwt.sign({ sub: payload.sub, role: payload.role, jti: newRawId() }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
  } as jwt.SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

export const generateRefreshToken = (): string => crypto.randomBytes(32).toString('hex');

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
