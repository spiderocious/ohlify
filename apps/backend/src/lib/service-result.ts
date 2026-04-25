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

  constructor(
    public errorCode: ErrorCode,
    public messageKey: MessageKey,
    public httpStatus = 400,
    fieldErrors?: Record<string, string[]>,
    retryAfter?: number,
  ) {
    if (fieldErrors !== undefined) this.fieldErrors = fieldErrors;
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
  }
}
