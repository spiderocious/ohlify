/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_USE_MOCKS: string;
  readonly VITE_AGORA_APP_ID: string;
  readonly VITE_PAYSTACK_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@paystack/inline-js' {
  type PaystackChannel = 'card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer' | 'eft';

  interface NewTransactionOptions {
    key: string;
    email: string;
    /** Amount in kobo (subunit of the currency). */
    amount: number;
    reference: string;
    currency?: string;
    channels?: PaystackChannel[];
    metadata?: Record<string, unknown>;
    onSuccess?: (response: { reference: string; trans?: string; status?: string }) => void;
    onCancel?: () => void;
    onLoad?: (response: unknown) => void;
    onError?: (error: { message: string }) => void;
  }

  export default class PaystackPop {
    newTransaction(options: NewTransactionOptions): void;
  }
}
