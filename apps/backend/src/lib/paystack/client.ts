import { logger } from '@lib/logger.js';

import { env } from '../../env.js';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const RESOLVE_TIMEOUT_MS = 5000;
const TRANSACTION_TIMEOUT_MS = 10_000;

export class PaystackUpstreamError extends Error {
  constructor(
    message: string,
    public readonly upstreamStatus?: number,
    public readonly upstreamCode?: string,
  ) {
    super(message);
    this.name = 'PaystackUpstreamError';
  }
}

export class PaystackUnresolvableError extends Error {
  constructor(message = 'Could not resolve account') {
    super(message);
    this.name = 'PaystackUnresolvableError';
  }
}

interface PaystackResolveResponse {
  status: boolean;
  message: string;
  data?: {
    account_number: string;
    account_name: string;
    bank_id?: number;
  };
}

const fetchWithTimeout = async (
  url: string,
  ms: number,
  init?: { method?: 'GET' | 'POST'; body?: unknown },
): Promise<Response> => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
  };
  if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    const requestInit: RequestInit = {
      method: init?.method ?? 'GET',
      headers,
      signal: controller.signal,
    };
    if (init?.body !== undefined) {
      requestInit.body = JSON.stringify(init.body);
    }
    return await fetch(url, requestInit);
  } finally {
    clearTimeout(t);
  }
};

// Resolves a bank account via Paystack name-enquiry. Throws
// PaystackUnresolvableError when Paystack reports the account doesn't exist
// (HTTP 422 / status:false), and PaystackUpstreamError on transport / 5xx /
// other upstream failures the user should be asked to retry.
export const resolveBankAccount = async (
  accountNumber: string,
  bankCode: string,
): Promise<{ account_name: string }> => {
  const url = `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${encodeURIComponent(
    accountNumber,
  )}&bank_code=${encodeURIComponent(bankCode)}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(url, RESOLVE_TIMEOUT_MS);
  } catch (err) {
    logger.warn({ err, bankCode }, 'paystack /bank/resolve transport error');
    throw new PaystackUpstreamError('paystack request failed');
  }

  let body: PaystackResolveResponse | null = null;
  try {
    body = (await res.json()) as PaystackResolveResponse;
  } catch {
    throw new PaystackUpstreamError('paystack returned non-json', res.status);
  }

  if (res.status === 422 || (res.status === 400 && body.status === false)) {
    throw new PaystackUnresolvableError(body.message || 'unresolvable account');
  }

  if (!res.ok || body.status !== true || !body.data) {
    logger.warn({ status: res.status, body, bankCode }, 'paystack /bank/resolve upstream failure');
    throw new PaystackUpstreamError(body.message || 'paystack upstream error', res.status);
  }

  return { account_name: body.data.account_name };
};

// ── Transaction (charge) initialization & verification ──────────────────────

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface InitializeTransactionInput {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export const initializeTransaction = async (
  input: InitializeTransactionInput,
): Promise<InitializeTransactionResult> => {
  const url = `${PAYSTACK_BASE_URL}/transaction/initialize`;
  const requestBody: Record<string, unknown> = {
    email: input.email,
    amount: input.amountKobo, // Paystack expects kobo
    reference: input.reference,
    currency: 'NGN',
  };
  if (input.callbackUrl !== undefined) requestBody['callback_url'] = input.callbackUrl;
  if (input.metadata !== undefined) requestBody['metadata'] = input.metadata;

  let res: Response;
  try {
    res = await fetchWithTimeout(url, TRANSACTION_TIMEOUT_MS, {
      method: 'POST',
      body: requestBody,
    });
  } catch (err) {
    logger.warn(
      { err, reference: input.reference },
      'paystack /transaction/initialize transport error',
    );
    throw new PaystackUpstreamError('paystack request failed');
  }

  let body: PaystackInitializeResponse;
  try {
    body = (await res.json()) as PaystackInitializeResponse;
  } catch {
    throw new PaystackUpstreamError('paystack returned non-json', res.status);
  }

  if (!res.ok || body.status !== true || !body.data) {
    logger.warn(
      { status: res.status, body, reference: input.reference },
      'paystack /transaction/initialize upstream failure',
    );
    throw new PaystackUpstreamError(body.message || 'paystack upstream error', res.status);
  }

  return {
    authorization_url: body.data.authorization_url,
    access_code: body.data.access_code,
    reference: body.data.reference,
  };
};

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    status: 'success' | 'failed' | 'abandoned' | 'pending';
    reference: string;
    amount: number;
    currency: string;
    fees?: number;
    channel?: string;
    paid_at?: string;
    customer?: { email?: string };
    metadata?: Record<string, unknown> | null;
  };
}

export interface VerifyTransactionResult {
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  reference: string;
  amount_kobo: number;
  currency: string;
  fees_kobo: number | null;
  channel: string | null;
  paid_at: string | null;
  raw: PaystackVerifyResponse['data'] | undefined;
}

export const verifyTransaction = async (reference: string): Promise<VerifyTransactionResult> => {
  const url = `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(url, TRANSACTION_TIMEOUT_MS);
  } catch (err) {
    logger.warn({ err, reference }, 'paystack /transaction/verify transport error');
    throw new PaystackUpstreamError('paystack request failed');
  }

  let body: PaystackVerifyResponse;
  try {
    body = (await res.json()) as PaystackVerifyResponse;
  } catch {
    throw new PaystackUpstreamError('paystack returned non-json', res.status);
  }

  if (!res.ok || body.status !== true || !body.data) {
    logger.warn(
      { status: res.status, body, reference },
      'paystack /transaction/verify upstream failure',
    );
    throw new PaystackUpstreamError(body.message || 'paystack upstream error', res.status);
  }

  return {
    status: body.data.status,
    reference: body.data.reference,
    amount_kobo: body.data.amount,
    currency: body.data.currency,
    fees_kobo: typeof body.data.fees === 'number' ? body.data.fees : null,
    channel: typeof body.data.channel === 'string' ? body.data.channel : null,
    paid_at: typeof body.data.paid_at === 'string' ? body.data.paid_at : null,
    raw: body.data,
  };
};
