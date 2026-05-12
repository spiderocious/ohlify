import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

import { UnauthorizedError } from '@lib/errors.js';
import { newRawId } from '@lib/ids.js';

import { env } from '../../env.js';

// Admin JWTs use a separate secret from user JWTs so an admin token can't be
// replayed against /api/v1/auth routes (and vice versa). Same HS256 shape;
// the role claim is admin-specific ('admin' | 'support' | 'finance_ops').

export type AdminRole = 'admin' | 'support' | 'finance_ops';

export interface AdminAccessTokenPayload {
  sub: string;
  role: AdminRole;
  jti: string;
  iat: number;
  exp: number;
}

export const signAdminAccessToken = (payload: { sub: string; role: AdminRole }): string =>
  jwt.sign({ sub: payload.sub, role: payload.role, jti: newRawId() }, env.ADMIN_JWT_ACCESS_SECRET, {
    expiresIn: env.ADMIN_JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
  } as jwt.SignOptions);

export const verifyAdminAccessToken = (token: string): AdminAccessTokenPayload => {
  try {
    return jwt.verify(token, env.ADMIN_JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as AdminAccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired admin token');
  }
};

// Admin refresh tokens are random bytes (not JWTs) — identical pattern to
// user refresh. Stored hashed in admin_sessions.refresh_token_hash.
export const generateAdminRefreshToken = (): string => crypto.randomBytes(32).toString('hex');

export const hashAdminRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
