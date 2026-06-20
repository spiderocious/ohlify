import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import PaystackPop from '@paystack/inline-js';
import { apiClient, EP, parseApiError, useMe } from '@ohlify/api';
import type { FundInitResponse, FundVerifyResponse } from '@ohlify/api';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

export type PaystackResult =
  | { kind: 'success'; reference: string; amountKobo: number }
  | { kind: 'pending'; reference: string }
  | { kind: 'failed'; reference: string; reason?: string }
  | { kind: 'cancelled' };

interface OpenParams {
  amountKobo: number;
}

/**
 * Wraps Paystack's inline-js popup. Calling `open(...)` initialises a payment
 * with the backend (which returns our internal reference + access code), then
 * mounts the Paystack iframe overlay. Resolves once the popup closes — either
 * with a verified success, a verified failure, or cancellation.
 *
 * Because the popup runs in-page, no full redirect happens and React state
 * survives the entire flow. After success, wallet queries are invalidated so
 * the caller sees the updated balance immediately.
 */
export function usePaystackInline() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [isPreparing, setIsPreparing] = useState(false);

  const open = useCallback(
    async ({ amountKobo }: OpenParams): Promise<PaystackResult> => {
      if (!PAYSTACK_PUBLIC_KEY) {
        throw new Error('VITE_PAYSTACK_PUBLIC_KEY is not configured');
      }
      if (!me?.email) {
        throw new Error('User email unavailable — cannot open Paystack');
      }

      setIsPreparing(true);

      // 1. Backend initialise — returns our internal reference (we use this as
      //    the Paystack reference too so verify can correlate).
      let init: FundInitResponse;
      try {
        const res = await apiClient
          .post(EP.WALLET_FUND_INIT, { json: { amount_kobo: amountKobo } })
          .json<{ data: FundInitResponse }>();
        init = res.data;
      } catch (err) {
        setIsPreparing(false);
        throw await parseApiError(err);
      }

      // 2. Open the popup. Resolves on success / cancel / close.
      const reference = init.reference;
      const popup = new PaystackPop();

      const popupResult = await new Promise<{ kind: 'success' } | { kind: 'cancelled' }>(
        (resolve) => {
          popup.newTransaction({
            key: PAYSTACK_PUBLIC_KEY,
            email: me.email,
            amount: amountKobo,
            reference,
            currency: init.currency,
            onLoad: () => {
              // Popup is now visible — clear preparing state.
              setIsPreparing(false);
            },
            onSuccess: () => resolve({ kind: 'success' }),
            onCancel: () => resolve({ kind: 'cancelled' }),
          });
        },
      );

      if (popupResult.kind === 'cancelled') {
        setIsPreparing(false);
        return { kind: 'cancelled' };
      }

      // 3. Server-side verify against Paystack so we don't trust the client.
      try {
        const verify = await apiClient
          .post(EP.WALLET_FUND_VERIFY, { json: { reference } })
          .json<{ data: FundVerifyResponse }>();

        const data = verify.data;

        if (data.status === 'success') {
          void qc.invalidateQueries({ queryKey: ['wallet'] });
          void qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
          return { kind: 'success', reference, amountKobo: data.amount_kobo };
        }
        if (data.status === 'pending') {
          return { kind: 'pending', reference };
        }
        return { kind: 'failed', reference };
      } catch (err) {
        const apiErr = await parseApiError(err);
        return { kind: 'failed', reference, reason: apiErr.errorMessage };
      }
    },
    [me, qc],
  );

  return { open, isPreparing };
}
