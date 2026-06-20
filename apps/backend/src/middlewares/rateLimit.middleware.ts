import rateLimit from 'express-rate-limit';

import { ERROR_CODES, severityFor } from '@shared/constants/error-codes.js';
import { resolveErrorMessage } from '@shared/constants/error-messages.js';

// Static body for express-rate-limit's `message` option (flat error envelope).
const RATE_LIMIT_BODY = {
  errorCode: severityFor(ERROR_CODES.RATE_LIMITED),
  errorMessage: resolveErrorMessage(ERROR_CODES.RATE_LIMITED),
  reason: ERROR_CODES.RATE_LIMITED,
};

export const globalRateLimit = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_BODY,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_BODY,
});
