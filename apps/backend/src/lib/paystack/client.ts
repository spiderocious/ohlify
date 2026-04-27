import { logger } from '@lib/logger.js';

import { env } from '../../env.js';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const RESOLVE_TIMEOUT_MS = 5000;

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

const fetchWithTimeout = async (url: string, ms: number): Promise<Response> => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
      signal: controller.signal,
    });
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
