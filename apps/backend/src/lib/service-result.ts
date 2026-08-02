import type { ErrorCode } from '@shared/constants/error-codes.js';
import type { MessageKey } from '@shared/constants/message-keys.js';

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  errorCode?: ErrorCode;
  messageKey?: MessageKey;
  httpStatus?: number;
  fieldErrors?: Record<string, string[]>;
}

export class ServiceSuccess<T> implements ServiceResult<T> {
  success = true as const;
  data: T;
  messageKey?: MessageKey;

  constructor(data: T, messageKey?: MessageKey) {
    this.data = data;
    if (messageKey !== undefined) this.messageKey = messageKey;
  }
}

export class ServiceError implements ServiceResult<never> {
  success = false as const;
  fieldErrors?: Record<string, string[]>;
  retryAfter?: number;
  /**
   * Which branch produced this error, when `errorCode` alone is too coarse to
   * say. Emitted verbatim as the envelope's `rejectionReason`.
   *
   * Purely diagnostic: `errorCode` stays the thing clients branch on, so adding
   * or renaming a detail never breaks a caller. Set it wherever one reason
   * covers several genuinely different causes.
   */
  rejectionReason?: string;

  constructor(
    public errorCode: ErrorCode,
    public messageKey: MessageKey,
    public httpStatus = 400,
    fieldErrors?: Record<string, string[]>,
    retryAfter?: number,
    rejectionReason?: string,
  ) {
    if (fieldErrors !== undefined) this.fieldErrors = fieldErrors;
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
    if (rejectionReason !== undefined) this.rejectionReason = rejectionReason;
  }
}
