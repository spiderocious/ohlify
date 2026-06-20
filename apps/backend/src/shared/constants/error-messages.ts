import { ERROR_CODES, type ErrorCode } from './error-codes.js';
import { MESSAGE_KEYS, type MessageKey } from './message-keys.js';

/**
 * Authoritative `reason → MessageKey` map for ERROR responses.
 *
 * Why central instead of trusting the per-callsite `messageKey`: several
 * services attach a placeholder key that does not describe the actual failure
 * (e.g. admin-auth tags `not_found`/`conflict`/`internal` with INVALID_CREDENTIALS).
 * Resolving the user-facing `errorMessage` off the stable `reason` guarantees
 * the message matches the error without auditing 28 callsites. A ServiceError's
 * own `messageKey` still wins when present (see resolveErrorMessage) so callsites
 * can override with something more specific.
 */
const REASON_MESSAGE_KEY: Record<ErrorCode, MessageKey> = {
  // Auth
  [ERROR_CODES.INVALID_CREDENTIALS]: MESSAGE_KEYS.INVALID_CREDENTIALS,
  [ERROR_CODES.ACCOUNT_LOCKED]: MESSAGE_KEYS.INVALID_CREDENTIALS,
  [ERROR_CODES.ACCOUNT_SUSPENDED]: MESSAGE_KEYS.FORBIDDEN,
  [ERROR_CODES.ACCOUNT_BLOCKED]: MESSAGE_KEYS.FORBIDDEN,
  [ERROR_CODES.INVALID_OTP]: MESSAGE_KEYS.OTP_INVALID,
  [ERROR_CODES.OTP_EXPIRED]: MESSAGE_KEYS.OTP_EXPIRED,
  [ERROR_CODES.OTP_MAX_ATTEMPTS]: MESSAGE_KEYS.OTP_INVALID,
  [ERROR_CODES.EMAIL_EXISTS]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.PHONE_EXISTS]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.TOKEN_INVALID]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.SESSION_REVOKED]: MESSAGE_KEYS.INVALID_CREDENTIALS,
  [ERROR_CODES.SESSION_EXPIRED]: MESSAGE_KEYS.INVALID_CREDENTIALS,
  [ERROR_CODES.CREDENTIAL_NOT_SET]: MESSAGE_KEYS.INVALID_CREDENTIALS,
  [ERROR_CODES.UNAUTHORIZED]: MESSAGE_KEYS.FORBIDDEN,
  // Bookings / calls
  [ERROR_CODES.SLOT_TAKEN]: MESSAGE_KEYS.BOOKING_CONFLICT,
  [ERROR_CODES.DOUBLE_BOOKING]: MESSAGE_KEYS.BOOKING_CONFLICT,
  [ERROR_CODES.OUTSIDE_CANCEL_WINDOW]: MESSAGE_KEYS.BOOKING_INVALID,
  [ERROR_CODES.JOIN_WINDOW_NOT_OPEN]: MESSAGE_KEYS.CALL_NOT_JOINABLE_KEY,
  [ERROR_CODES.CANNOT_BOOK_SELF]: MESSAGE_KEYS.BOOKING_INVALID,
  [ERROR_CODES.RATE_NOT_FOUND]: MESSAGE_KEYS.RATE_NOT_FOUND,
  [ERROR_CODES.PROFESSIONAL_UNAVAILABLE]: MESSAGE_KEYS.BOOKING_INVALID,
  [ERROR_CODES.BOOKING_NOT_FOUND]: MESSAGE_KEYS.BOOKING_NOT_FOUND_KEY,
  [ERROR_CODES.CALL_NOT_FOUND]: MESSAGE_KEYS.CALL_NOT_FOUND_KEY,
  [ERROR_CODES.CALL_NOT_JOINABLE]: MESSAGE_KEYS.CALL_NOT_JOINABLE_KEY,
  // Wallet
  [ERROR_CODES.INSUFFICIENT_BALANCE]: MESSAGE_KEYS.WALLET_PAY_INSUFFICIENT,
  [ERROR_CODES.NO_BANK_ACCOUNT]: MESSAGE_KEYS.WALLET_WITHDRAWAL_NO_BANK,
  // Strikes
  [ERROR_CODES.STRIKE_NOT_FOUND]: MESSAGE_KEYS.STRIKE_NOT_FOUND_KEY,
  [ERROR_CODES.STRIKE_DISPUTE_WINDOW_CLOSED]: MESSAGE_KEYS.STRIKE_DISPUTE_WINDOW_CLOSED_KEY,
  [ERROR_CODES.STRIKE_NOT_DISPUTABLE]: MESSAGE_KEYS.STRIKE_NOT_DISPUTABLE_KEY,
  [ERROR_CODES.STRIKE_REASON_ROLE_MISMATCH]: MESSAGE_KEYS.ADMIN_STRIKE_INVALID,
  // Reviews
  [ERROR_CODES.REVIEW_NOT_FOUND]: MESSAGE_KEYS.REVIEW_NOT_FOUND_KEY,
  [ERROR_CODES.REVIEW_EXISTS]: MESSAGE_KEYS.REVIEW_CONFLICT,
  [ERROR_CODES.REVIEW_NOT_ELIGIBLE]: MESSAGE_KEYS.REVIEW_INVALID,
  // Handles
  [ERROR_CODES.HANDLE_TAKEN]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.HANDLE_INVALID_FORMAT]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.HANDLE_RESERVED]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.HANDLE_COOLDOWN]: MESSAGE_KEYS.VALIDATION_FAILED,
  // Generic
  [ERROR_CODES.NOT_FOUND]: MESSAGE_KEYS.NOT_FOUND,
  [ERROR_CODES.FORBIDDEN]: MESSAGE_KEYS.FORBIDDEN,
  [ERROR_CODES.VALIDATION_ERROR]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.VALUE_OUT_OF_RANGE]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.RATE_LIMITED]: MESSAGE_KEYS.RATE_LIMITED_KEY,
  [ERROR_CODES.INTERNAL]: MESSAGE_KEYS.INTERNAL_ERROR,
  [ERROR_CODES.UPSTREAM_UNAVAILABLE]: MESSAGE_KEYS.BANKS_UPSTREAM_ERROR,
  [ERROR_CODES.CONFLICT]: MESSAGE_KEYS.CONFLICT_KEY,
  [ERROR_CODES.IDEMPOTENCY_MISMATCH]: MESSAGE_KEYS.CONFLICT_KEY,
  // Admin bootstrap
  [ERROR_CODES.BOOTSTRAP_DISABLED]: MESSAGE_KEYS.ADMIN_BOOTSTRAP_DISABLED,
  [ERROR_CODES.ALREADY_BOOTSTRAPPED]: MESSAGE_KEYS.ADMIN_BOOTSTRAP_ALREADY_DONE,
  // Onboarding / role
  [ERROR_CODES.ROLE_ALREADY_SET]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.ROLE_REQUIRED]: MESSAGE_KEYS.FORBIDDEN,
  [ERROR_CODES.ROLE_MISMATCH]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.KYC_INCOMPLETE]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.IDENTITY_REQUIRED_FIRST]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.ITEM_NOT_IN_RESUBMIT_SET]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.RESUBMIT_UNCHANGED]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.USER_NOT_FOUND]: MESSAGE_KEYS.NOT_FOUND,
  // Profile
  [ERROR_CODES.ACCOUNT_NAME_MISMATCH]: MESSAGE_KEYS.BANK_ACCOUNT_UNRESOLVABLE,
  [ERROR_CODES.UNRESOLVABLE_ACCOUNT]: MESSAGE_KEYS.BANK_ACCOUNT_UNRESOLVABLE,
  [ERROR_CODES.CONFIRMATION_REQUIRED]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.BANK_NOT_FOUND]: MESSAGE_KEYS.BANK_NOT_FOUND,
  [ERROR_CODES.CATEGORY_INVALID]: MESSAGE_KEYS.VALIDATION_FAILED,
  [ERROR_CODES.AVATAR_INVALID]: MESSAGE_KEYS.VALIDATION_FAILED,
};

/**
 * Human-readable English text for each MessageKey reachable from an error path.
 * Today the codebase never resolved keys to prose — `errorMessage` was the
 * useless constant `'Request failed'`. This is the resolution table. Keys not
 * listed fall back to a generic message, so a response is never key-leaking.
 */
const MESSAGE_TEXT: Partial<Record<MessageKey, string>> = {
  [MESSAGE_KEYS.INVALID_CREDENTIALS]: 'The email or password you entered is incorrect.',
  [MESSAGE_KEYS.OTP_INVALID]: 'The code you entered is incorrect.',
  [MESSAGE_KEYS.OTP_EXPIRED]: 'This code has expired. Request a new one.',
  [MESSAGE_KEYS.NOT_FOUND]: 'We couldn’t find what you were looking for.',
  [MESSAGE_KEYS.FORBIDDEN]: 'You don’t have permission to do that.',
  [MESSAGE_KEYS.INTERNAL_ERROR]: 'Something went wrong on our end. Please try again.',
  [MESSAGE_KEYS.VALIDATION_FAILED]: 'Please check the form and try again.',
  [MESSAGE_KEYS.RATE_LIMITED_KEY]: 'Too many requests. Please wait a moment and try again.',
  [MESSAGE_KEYS.CONFLICT_KEY]:
    'That action conflicts with the current state. Please refresh and try again.',
  [MESSAGE_KEYS.RATE_NOT_FOUND]: 'That rate no longer exists.',
  [MESSAGE_KEYS.RATE_DUPLICATE]: 'A rate for this call type and duration already exists.',
  [MESSAGE_KEYS.RATE_INVALID_DURATION]: 'That call duration isn’t allowed.',
  [MESSAGE_KEYS.RATE_INVALID_PRICE]: 'That price is outside the allowed range.',
  [MESSAGE_KEYS.PROFESSIONAL_NOT_FOUND]: 'This professional isn’t available.',
  [MESSAGE_KEYS.REVIEW_INVALID]: 'You can’t review this call.',
  [MESSAGE_KEYS.REVIEW_NOT_FOUND_KEY]: 'That review no longer exists.',
  [MESSAGE_KEYS.REVIEW_CONFLICT]: 'You’ve already reviewed this call.',
  [MESSAGE_KEYS.BANK_ACCOUNT_UNRESOLVABLE]:
    'We couldn’t verify that bank account. Check the details and try again.',
  [MESSAGE_KEYS.BANKS_UPSTREAM_ERROR]:
    'Our bank verification provider is unavailable right now. Please try again shortly.',
  [MESSAGE_KEYS.BANK_NOT_FOUND]: 'That bank isn’t supported.',
  [MESSAGE_KEYS.BOOKING_CONFLICT]: 'That time slot is no longer available.',
  [MESSAGE_KEYS.BOOKING_INVALID]: 'This booking can’t be completed as requested.',
  [MESSAGE_KEYS.BOOKING_NOT_FOUND_KEY]: 'That booking no longer exists.',
  [MESSAGE_KEYS.CALL_NOT_FOUND_KEY]: 'That call no longer exists.',
  [MESSAGE_KEYS.CALL_NOT_JOINABLE_KEY]: 'This call can’t be joined right now.',
  [MESSAGE_KEYS.WALLET_PAY_INSUFFICIENT]: 'Your wallet balance is too low for this.',
  [MESSAGE_KEYS.WALLET_WITHDRAWAL_NO_BANK]: 'Add a bank account before withdrawing.',
  [MESSAGE_KEYS.STRIKE_NOT_FOUND_KEY]: 'That strike no longer exists.',
  [MESSAGE_KEYS.STRIKE_DISPUTE_WINDOW_CLOSED_KEY]: 'The window to dispute this strike has closed.',
  [MESSAGE_KEYS.STRIKE_NOT_DISPUTABLE_KEY]: 'This strike can’t be disputed.',
  [MESSAGE_KEYS.ADMIN_STRIKE_INVALID]: 'That strike reason doesn’t apply to this user’s role.',
  [MESSAGE_KEYS.ADMIN_BOOTSTRAP_DISABLED]: 'Admin bootstrap is disabled.',
  [MESSAGE_KEYS.ADMIN_BOOTSTRAP_ALREADY_DONE]: 'An admin account already exists.',
};

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Validation policy: surface ONE field error at a time. When several fields are
 * invalid we return only the FIRST (in schema-declaration order, which is the
 * order Zod reports issues), so the UI guides the user fix-by-fix rather than
 * dumping every problem at once. The caller resolves the rest on resubmit.
 *
 * Returns the single-entry `fieldErrors` map plus the message of that first
 * field, so the error builder can also use it as the top-level `errorMessage`.
 */
export interface FirstFieldError {
  field: string;
  message: string;
  fieldErrors: Record<string, string[]>;
}

export const firstFieldError = (
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): FirstFieldError | undefined => {
  const first = issues[0];
  if (first === undefined) return undefined;
  const field = first.path.join('.') || '_root';
  return { field, message: first.message, fieldErrors: { [field]: [first.message] } };
};

/** Looks up the English text for a MessageKey, or undefined if none is defined. */
const textForKey = (key: MessageKey | undefined): string | undefined =>
  key !== undefined ? MESSAGE_TEXT[key] : undefined;

/** Resolves a MessageKey to its English text, defaulting to a generic message. */
export const messageTextForKey = (key: MessageKey | undefined): string =>
  textForKey(key) ?? GENERIC_ERROR_MESSAGE;

/**
 * Resolves the user-facing `errorMessage` for an error response.
 *
 * A ServiceError's carried `messageKey` wins ONLY when it actually maps to real
 * error text — many services attach a placeholder or even a success key on
 * error paths (e.g. invalid_otp tagged with AUTH_MESSAGES.OTP_SENT). When the
 * carried key has no text, we fall back to the reason's authoritative key
 * (decision #2: messages are driven by the stable `reason`), then to a generic
 * message. This guarantees the message always matches the failure.
 */
export const resolveErrorMessage = (reason: string, messageKey?: MessageKey): string => {
  const fromCarriedKey = textForKey(messageKey);
  if (fromCarriedKey !== undefined) return fromCarriedKey;
  const fromReason = textForKey(REASON_MESSAGE_KEY[reason as ErrorCode]);
  return fromReason ?? GENERIC_ERROR_MESSAGE;
};
