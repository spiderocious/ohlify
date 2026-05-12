export type TransactionType =
  | 'withdrawalToBank'
  | 'paymentAudioCall'
  | 'paymentVideoCall'
  | 'scheduledAudioCall' | 'walletFunding';

export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Display-formatted timestamp, e.g. "Feb 2, 2023, 09:56 AM". */
  datetime: string;
  /** Signed display amount, e.g. "₦20,000.00", "-₦20,000.00", "+₦20,000.00". */
  amount: string;
  status: TransactionStatus;
}

export const transactionTitle: Record<TransactionType, string> = {
  withdrawalToBank: 'Withdrawal to bank',
  paymentAudioCall: 'Payment for audio call',
  paymentVideoCall: 'Payment for video call',
  scheduledAudioCall: 'Scheduled audio call',
  walletFunding: 'Wallet funding',
};

export const isCredit = (tx: Transaction): boolean => tx.amount.startsWith('+');
export const isDebit = (tx: Transaction): boolean => tx.amount.startsWith('-');

export interface WalletStats {
  thisWeek: number;
  thisMonth: number;
  totalCalls: number;
}

export interface CallStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
}

export interface BankDetails {
  accountNumber: string;
  bankName: string;
  /** Filled in after Paystack name resolution. */
  accountName?: string;
}
